import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { glob } from "glob";
import type { PermissionCategory } from "./permissions.js";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file at the given path",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to working directory" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file with the given content",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to working directory" },
          content: { type: "string", description: "Content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files in a directory, optionally filtering by glob pattern",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path relative to working directory" },
          pattern: { type: "string", description: "Glob pattern to filter (e.g. '**/*.ts')" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files",
      description: "Search file contents for a regex pattern",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Regex pattern to search for" },
          path: { type: "string", description: "Directory to search in (default: '.')" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "shell_exec",
      description: "Execute a shell command and return stdout/stderr",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to execute" },
        },
        required: ["command"],
      },
    },
  },
];

const CATEGORY_MAP: Record<string, PermissionCategory> = {
  read_file: "file_read",
  list_files: "file_read",
  search_files: "file_read",
  write_file: "file_write",
  shell_exec: "shell_exec",
};

export function getToolCategory(name: string): PermissionCategory {
  const cat = CATEGORY_MAP[name];
  if (!cat) throw new Error(`Unknown tool: ${name}`);
  return cat;
}

// ── 출력 폭증 방지: 툴 결과 크기·항목 수 상한 + 무거운 폴더 제외 ──
// (제한이 없으면 list_files **/* 나 큰 파일이 대화 히스토리에 통째로 쌓여
//  매 턴 재전송되며 토큰이 폭증한다.)
const MAX_TOOL_CHARS = 12_000; // 대부분 툴 결과 상한
const MAX_READ_CHARS = 40_000; // read_file 은 조금 더 여유
const MAX_ITEMS = 400; // list/search 결과 항목 수
const MAX_FILE_BYTES = 1_000_000; // search 시 이보다 큰 파일은 건너뜀
const IGNORE: string[] = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/.cache/**",
  "**/*.min.js",
  "**/*.map",
  "**/*.lock",
];

function truncate(text: string, max: number, why = "생략"): string {
  if (text.length <= max) return text;
  return (
    text.slice(0, max) +
    `\n… [${why}: ${text.length - max}자 잘림 / 원본 ${text.length}자]`
  );
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  cwd: string
): Promise<string> {
  try {
    switch (name) {
      case "read_file": {
        const filePath = path.resolve(cwd, args.path as string);
        // 거대 파일은 통째로 메모리에 올리지 않고 앞부분만 읽는다.
        if (fs.statSync(filePath).size > 2_000_000) {
          const fd = fs.openSync(filePath, "r");
          const buf = Buffer.alloc(MAX_READ_CHARS);
          const n = fs.readSync(fd, buf, 0, MAX_READ_CHARS, 0);
          fs.closeSync(fd);
          return truncate(buf.toString("utf-8", 0, n), MAX_READ_CHARS, "파일이 큼(앞부분만)");
        }
        const content = fs.readFileSync(filePath, "utf-8");
        return truncate(content, MAX_READ_CHARS, "파일이 큼");
      }
      case "write_file": {
        const filePath = path.resolve(cwd, args.path as string);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, args.content as string, "utf-8");
        return `File written: ${args.path}`;
      }
      case "list_files": {
        const dirPath = path.resolve(cwd, args.path as string);
        const pattern = (args.pattern as string) || "*";
        const files = await glob(pattern, { cwd: dirPath, ignore: IGNORE });
        files.sort();
        const shown = files.slice(0, MAX_ITEMS);
        let out = shown.join("\n");
        if (files.length > MAX_ITEMS) {
          out += `\n… (${files.length - MAX_ITEMS}개 더 있음 / 총 ${files.length}개, node_modules 등 제외)`;
        }
        return truncate(out, MAX_TOOL_CHARS);
      }
      case "search_files": {
        const searchDir = path.resolve(cwd, (args.path as string) || ".");
        const regex = new RegExp(args.pattern as string);
        const allFiles = await glob("**/*", {
          cwd: searchDir,
          nodir: true,
          ignore: IGNORE,
        });
        const results: string[] = [];
        for (const file of allFiles) {
          if (results.length >= MAX_ITEMS) break;
          const fullPath = path.join(searchDir, file);
          let content: string;
          try {
            if (fs.statSync(fullPath).size > MAX_FILE_BYTES) continue;
            content = fs.readFileSync(fullPath, "utf-8");
          } catch {
            continue;
          }
          if (content.includes("\u0000")) continue; // 바이너리 건너뜀
          const lines = content.split("\n");
          for (let i = 0; i < lines.length && results.length < MAX_ITEMS; i++) {
            if (regex.test(lines[i])) {
              results.push(`${file}:${i + 1}: ${lines[i].slice(0, 200)}`);
            }
          }
        }
        let out = results.length > 0 ? results.join("\n") : "No matches found.";
        if (results.length >= MAX_ITEMS) out += `\n… (결과가 많아 ${MAX_ITEMS}개에서 잘림)`;
        return truncate(out, MAX_TOOL_CHARS);
      }
      case "shell_exec": {
        const output = await new Promise<string>((resolve) => {
          const child = exec(args.command as string, {
            cwd,
            timeout: 120_000,
            maxBuffer: 10 * 1024 * 1024,
          });
          let stdout = "";
          let stderr = "";
          child.stdout?.on("data", (data) => (stdout += data));
          child.stderr?.on("data", (data) => (stderr += data));
          child.on("close", (code) => {
            const out = stdout + (stderr ? `\nSTDERR:\n${stderr}` : "");
            resolve(code !== 0 ? `Exit code ${code}\n${out}` : out);
          });
          child.on("error", (err) => resolve(`Error: ${err.message}`));
        });
        return truncate(output, MAX_TOOL_CHARS, "출력이 김");
      }
      default:
        return `Error: Unknown tool "${name}"`;
    }
  } catch (err) {
    return `Error: ${(err as Error).message}`;
  }
}

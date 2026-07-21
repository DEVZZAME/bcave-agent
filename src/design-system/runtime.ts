import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export interface DesignLintResult {
  file: string;
  violations: Array<{ rule: string; msg: string; line: number | null }>;
  warnings: Array<{ rule: string; msg: string; line: number | null }>;
  pass: boolean;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/design-systems");

export function designSystemDir(name: string): string {
  return path.join(ROOT, name);
}

export function hasDesignSystem(name: string): boolean {
  return !!name && fs.existsSync(path.join(designSystemDir(name), "RULES.md"));
}

export function designRules(name: string): string {
  return fs.readFileSync(path.join(designSystemDir(name), "RULES.md"), "utf8");
}

export function isUiArtifactRequest(message: string): boolean {
  return /(대시보드|dashboard|화면|페이지|랜딩|리포트|보고서|html|웹\s?ui|\bui\b|screen|landing|report)/i.test(message);
}

function extractBlock(source: string, kind: "html:body" | "js:app"): string | null {
  const escaped = kind.replace(":", "\\s*:\\s*");
  const match = source.match(new RegExp("```" + escaped + "\\s*\\n([\\s\\S]*?)```", "i"));
  return match ? match[1].trim() : null;
}

function titleFromBody(body: string, fallback: string): string {
  const raw = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    ?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return raw || fallback.replace(/[-_]+/g, " ");
}

export function assembleDesignArtifact(name: string, source: string, outputPath: string): string {
  const dir = designSystemDir(name);
  const body = extractBlock(source, "html:body");
  const app = extractBlock(source, "js:app");
  if (body == null || app == null) {
    throw new Error("디자인 시스템 출력 계약 위반: ```html:body```와 ```js:app``` 코드펜스 두 개만 write_file content로 전달하세요. 완성 HTML은 전달하지 마세요.");
  }

  const dataLines: string[] = [];
  const appLines: string[] = [];
  for (const line of app.split("\n")) {
    if (/\{\{BCAVE_(?:DATA|SHEETS):/.test(line)) dataLines.push(line);
    else appLines.push(line);
  }

  const replacements: Record<string, string> = {
    TITLE: titleFromBody(body, path.basename(outputPath, path.extname(outputPath))),
    TOKENS_CSS: fs.readFileSync(path.join(dir, "bcave-tokens.css"), "utf8"),
    UI_CSS: fs.readFileSync(path.join(dir, "bcave-ui.css"), "utf8"),
    CHARTJS_BUNDLE: fs.readFileSync(path.join(dir, "vendor", "chart.umd.js"), "utf8"),
    CHART_ADAPTER: fs.readFileSync(path.join(dir, "bcave-chart.js"), "utf8"),
    DATA: dataLines.join("\n"),
    BODY: body.split("<!--BCAVE_SYMBOL_SVG-->").join(fs.readFileSync(path.join(dir, "bcave-symbol.svg"), "utf8")),
    APP_SCRIPT: appLines.join("\n"),
  };
  let html = fs.readFileSync(path.join(dir, "template.html"), "utf8");
  for (const [key, value] of Object.entries(replacements)) html = html.split(`{{${key}}}`).join(value);
  return html;
}

export function lintDesignArtifact(name: string, filePath: string): DesignLintResult {
  const dir = designSystemDir(name);
  const lint = path.join(dir, "bcave-lint.cjs");
  const result = spawnSync(process.execPath, [lint, filePath, "--ui", path.join(dir, "bcave-ui.css"), "--json"], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  try {
    return JSON.parse(result.stdout) as DesignLintResult;
  } catch {
    throw new Error(`디자인 린터 실행 실패: ${(result.stderr || result.stdout || `exit ${result.status}`).trim()}`);
  }
}

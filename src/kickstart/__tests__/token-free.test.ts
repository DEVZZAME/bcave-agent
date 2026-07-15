import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// 스펙 요구사항 13~15: /kickstart 는 LLM/외부 AI API/네트워크를 절대 호출하지 않는다.
describe("kickstart is token-free (no LLM / no network)", () => {
  it("source files call no LLM or network APIs", () => {
    const dir = path.join(process.cwd(), "src", "kickstart");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
    const banned = /\bfetch\b|openai|OpenAI|anthropic|Anthropic|https?:\/\/|node:https?|node:net/;
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), "utf-8");
      expect(banned.test(src), `${f} 에 네트워크/LLM 호출이 없어야 합니다`).toBe(false);
    }
    expect(files.length).toBeGreaterThan(0);
  });
});

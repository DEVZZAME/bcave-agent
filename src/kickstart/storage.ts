// /kickstart 저장 — 임시 초안(resume용) + 최종 .agent/kickstart.json / .md.
// 파일 I/O 만 담당. 오류(권한·잘못된 JSON)는 호출부에서 처리하도록 throw.

import fs from "node:fs";
import path from "node:path";
import type { KickstartState } from "./types.js";
import { buildFinalRecord, buildMarkdown } from "./formatter.js";

const DIR = ".agent";
const DRAFT = "kickstart.draft.json";
const JSON_FILE = "kickstart.json";
const MD_FILE = "kickstart.md";

function agentDir(cwd: string): string {
  return path.join(cwd, DIR);
}

function ensureDir(cwd: string): void {
  fs.mkdirSync(agentDir(cwd), { recursive: true });
}

/** 진행 중 임시 상태 저장 (답변마다 호출) */
export function saveDraft(cwd: string, state: KickstartState): void {
  ensureDir(cwd);
  fs.writeFileSync(path.join(agentDir(cwd), DRAFT), JSON.stringify(state, null, 2), "utf-8");
}

/** 중단된 초안 불러오기 (없으면 null) */
export function loadDraft(cwd: string): KickstartState | null {
  const p = path.join(agentDir(cwd), DRAFT);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as KickstartState;
  } catch {
    return null; // 손상된 초안은 무시
  }
}

export function clearDraft(cwd: string): void {
  const p = path.join(agentDir(cwd), DRAFT);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

/** 최종 확정본 존재 여부 (덮어쓰기 확인용) */
export function finalExists(cwd: string): boolean {
  return fs.existsSync(path.join(agentDir(cwd), JSON_FILE));
}

/** 확정 저장 — kickstart.json + kickstart.md, 초안 제거. 저장한 파일 경로 반환. */
export function saveFinal(cwd: string, state: KickstartState): { json: string; md: string } {
  ensureDir(cwd);
  const jsonPath = path.join(agentDir(cwd), JSON_FILE);
  const mdPath = path.join(agentDir(cwd), MD_FILE);
  fs.writeFileSync(jsonPath, JSON.stringify(buildFinalRecord(state), null, 2), "utf-8");
  fs.writeFileSync(mdPath, buildMarkdown(state), "utf-8");
  clearDraft(cwd);
  return { json: path.join(DIR, JSON_FILE), md: path.join(DIR, MD_FILE) };
}

/** 저장된 확정본 불러오기 (없으면 null) */
export function loadFinal(cwd: string): Record<string, unknown> | null {
  const p = path.join(agentDir(cwd), JSON_FILE);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** 확정본 원문(md) 불러오기 */
export function loadFinalMarkdown(cwd: string): string | null {
  const p = path.join(agentDir(cwd), MD_FILE);
  if (!fs.existsSync(p)) return null;
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return null;
  }
}

/** 전체 초기화 — json/md/draft 제거 */
export function resetAll(cwd: string): void {
  for (const f of [JSON_FILE, MD_FILE, DRAFT]) {
    const p = path.join(agentDir(cwd), f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

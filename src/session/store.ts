// 대화 세션 저장/복원 — /resume 로 이전 세션을 다시 연다.
// 세션은 ~/.bcave/sessions/<id>.json 에 (시스템 프롬프트 제외) 히스토리로 저장된다.

import fs from "node:fs";
import path from "node:path";
import { getConfigDir } from "../config/config.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface SessionMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  cwd: string;
  title: string; // 첫 사용자 메시지 요약
  turns: number; // 사용자 발화 수
}
export interface Session extends SessionMeta {
  messages: ChatCompletionMessageParam[]; // 시스템 프롬프트 제외
}

function sessionsDir(): string {
  const d = path.join(getConfigDir(), "sessions");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export function newSessionId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function saveSession(s: Session): void {
  try {
    fs.writeFileSync(path.join(sessionsDir(), `${s.id}.json`), JSON.stringify(s));
  } catch {
    /* 저장 실패는 대화를 막지 않는다 */
  }
}

export function listSessions(limit = 50): SessionMeta[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(sessionsDir()).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const metas: SessionMeta[] = [];
  for (const f of files) {
    try {
      const s = JSON.parse(fs.readFileSync(path.join(sessionsDir(), f), "utf8")) as Session;
      metas.push({ id: s.id, createdAt: s.createdAt, updatedAt: s.updatedAt, cwd: s.cwd, title: s.title, turns: s.turns });
    } catch {
      /* 손상 파일 무시 */
    }
  }
  metas.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)); // 최신 먼저
  return metas.slice(0, limit);
}

export function loadSession(id: string): Session | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(sessionsDir(), `${id}.json`), "utf8")) as Session;
  } catch {
    return null;
  }
}

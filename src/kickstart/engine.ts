// /kickstart 엔진 — 질문 목록을 순서대로 진행하는 순수 로직.
// 터미널/파일 I/O 는 WizardIO/persist 로 주입받아 테스트 가능하게 한다.
// LLM/네트워크 호출 없음.

import type { KickstartQuestion, WizardIO, KickstartState } from "./types.js";
import { UNKNOWN } from "./schemas.js";

export type StepResult = "done" | "back" | "cancel";

function applies(q: KickstartQuestion, answers: Record<string, string | string[]>): boolean {
  if (!q.condition) return true;
  const v = answers[q.condition.field];
  const target = q.condition.value;
  switch (q.condition.operator) {
    case "equals":
      return v === target;
    case "not_equals":
      return v !== target;
    case "includes":
      return Array.isArray(v) && v.includes(target as string);
    default:
      return true;
  }
}

/** 답변 하나를 상태에 기록 (unknown 처리 포함). */
function record(state: KickstartState, q: KickstartQuestion, value: string | string[] | typeof UNKNOWN): void {
  const clearUnknown = () => {
    state.unknownFields = state.unknownFields.filter((f) => f !== q.id);
  };
  const markUnknown = () => {
    if (!state.unknownFields.includes(q.id)) state.unknownFields.push(q.id);
  };

  if (Array.isArray(value)) {
    if (value.includes(UNKNOWN)) {
      markUnknown();
      state.answers[q.id] = value.filter((v) => v !== UNKNOWN);
    } else {
      clearUnknown();
      state.answers[q.id] = value;
    }
  } else if (value === UNKNOWN) {
    markUnknown();
    state.answers[q.id] = UNKNOWN;
  } else {
    clearUnknown();
    state.answers[q.id] = value;
  }
  if (!state.answered.includes(q.id)) state.answered.push(q.id);
  state.updatedAt = new Date().toISOString();
}

/** 답변 하나를 상태에 적용 (수정 기능 등에서 재사용). back/cancel 은 무시. */
export function applyAnswer(
  state: KickstartState,
  q: KickstartQuestion,
  ans: import("./types.js").Answer,
): void {
  if (ans.kind === "unknown") record(state, q, UNKNOWN);
  else if (ans.kind === "value") record(state, q, ans.value);
}

function forget(state: KickstartState, q: KickstartQuestion): void {
  delete state.answers[q.id];
  state.unknownFields = state.unknownFields.filter((f) => f !== q.id);
  state.answered = state.answered.filter((f) => f !== q.id);
}

/**
 * 질문 목록을 순서대로 진행한다.
 * - 조건에 안 맞는 질문은 건너뛴다.
 * - "이전(back)": 직전 질문으로 (그룹 첫 질문에서 back → "back" 반환).
 * - "취소(cancel)": "cancel" 반환.
 * - 각 답변/이동마다 persist(state) 호출 → 비정상 종료 후 resume 가능.
 */
export async function runQuestions(
  questions: KickstartQuestion[],
  io: WizardIO,
  state: KickstartState,
  persist: (s: KickstartState) => void,
): Promise<StepResult> {
  const visited: number[] = [];
  let i = 0;
  while (i < questions.length) {
    const q = questions[i];
    if (!applies(q, state.answers)) {
      i++;
      continue;
    }
    const total = questions.filter((x) => applies(x, state.answers)).length;
    const ans = await io.ask(q, { step: visited.length + 1, total });

    if (ans.kind === "cancel") return "cancel";
    if (ans.kind === "back") {
      const prev = visited.pop();
      if (prev === undefined) return "back";
      forget(state, questions[prev]);
      persist(state);
      i = prev;
      continue;
    }
    if (ans.kind === "unknown") {
      record(state, q, UNKNOWN);
    } else {
      record(state, q, ans.value);
    }
    persist(state);
    visited.push(i);
    i++;
  }
  return "done";
}

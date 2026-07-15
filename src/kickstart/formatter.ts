// /kickstart 결과 표현 — 요약 화면, 최종 JSON 구조, kickstart.md 생성.
// 답변은 옵션 '값'으로 저장되므로 스키마로 라벨을 되짚어 사람이 읽게 만든다.

import type { KickstartQuestion, KickstartState, ProjectSchema } from "./types.js";
import { DISCOVERY, UNKNOWN, getSchema, flowQuestions } from "./schemas.js";

export function questionsFor(type: string): KickstartQuestion[] {
  return flowQuestions(type);
}

function labelOf(q: KickstartQuestion, value: string): string {
  if (value === UNKNOWN) return "미정";
  const opt = q.options?.find((x) => x.value === value);
  return opt ? opt.label : value;
}

/** 답변을 사람이 읽는 문자열로 */
function displayAnswer(q: KickstartQuestion, v: string | string[]): string {
  if (Array.isArray(v)) {
    if (v.length === 0) return "미정";
    return v.map((x) => labelOf(q, x)).join(", ");
  }
  if (v === UNKNOWN || v === "") return "미정";
  return labelOf(q, v);
}

/** {questionId, message, answer} 목록 (요약/마크다운 공용) */
export function answeredRows(state: KickstartState): { id: string; message: string; answer: string }[] {
  const qs = questionsFor(state.projectType);
  const rows: { id: string; message: string; answer: string }[] = [];
  for (const id of state.answered) {
    const q = qs.find((x) => x.id === id);
    if (!q) continue;
    rows.push({ id, message: q.message, answer: displayAnswer(q, state.answers[id]) });
  }
  return rows;
}

/** 최종 확인 요약 화면 텍스트 */
export function buildSummary(state: KickstartState): string {
  const schema = getSchema(state.projectType);
  const typeLabel = state.projectType === "discovery" ? DISCOVERY.label : (schema?.label ?? state.projectType);
  const bar = "──────────────────────────────────";
  const lines: string[] = [bar, "Kickstart 기획 요약", bar, "", `프로젝트 유형: ${typeLabel}`, ""];
  for (const r of answeredRows(state)) {
    lines.push(`• ${r.message}`);
    lines.push(`  → ${r.answer}`);
  }
  if (state.unknownFields.length > 0) {
    lines.push("", `아직 정해지지 않은 항목: ${state.unknownFields.length}개 (미정으로 저장)`);
  }
  lines.push(bar);
  return lines.join("\n");
}

/** 저장용 공통 JSON 구조 (스펙의 kickstart.json 형식) */
export function buildFinalRecord(state: KickstartState): Record<string, unknown> {
  const a = state.answers;
  const asArr = (v: unknown): string[] => (Array.isArray(v) ? v : v && v !== UNKNOWN ? [String(v)] : []);
  const asStr = (v: unknown): string => (typeof v === "string" && v !== UNKNOWN ? v : "");
  // requirements 의 unknown 센티널은 최종 파일에서 빈 값으로 정리 (목록은 unknownFields 에)
  const cleanReq: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(a)) cleanReq[k] = v === UNKNOWN ? "" : v;
  return {
    version: "1.0",
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    status: "confirmed",
    projectType: state.recommendedType ?? state.projectType,
    projectSummary: asStr(a.summary) || asStr(a.dashboardPurpose) || asStr(a.serviceType) || asStr(a.documentType) || asStr(a.automationTarget) || asStr(a.analysisGoal) || asStr(a.presentationPurpose),
    targetUsers: asArr(a.targetUsers ?? a.audience),
    problemStatement: asStr(a.userProblem) || asStr(a.currentPain) || asStr(a.analysisGoal),
    desiredOutcome: asStr(a.desiredState) || asStr(a.desiredOutput) || asStr(a.outputFormat) || asStr(a.projectScope),
    requirements: cleanReq, // 유형별 상세 답변 전체 (unknown 은 빈 값)
    availableMaterials: asArr(a.availableMaterials),
    constraints: asArr(a.constraints),
    deadline: a.deadline === "custom" ? asStr(a.deadlineDate) : asStr(a.deadline) || null,
    unknownFields: [...state.unknownFields],
  };
}

/** 사람이 읽는 kickstart.md */
export function buildMarkdown(state: KickstartState): string {
  const schema = getSchema(state.projectType);
  const typeLabel = state.projectType === "discovery" ? DISCOVERY.label : (schema?.label ?? state.projectType);
  const rows = answeredRows(state);
  const lines: string[] = [
    "# Kickstart 기획서",
    "",
    `- 생성: ${state.createdAt}`,
    `- 프로젝트 유형: **${typeLabel}**`,
    "",
    "## 수집된 요구사항",
    "",
  ];
  for (const r of rows) {
    lines.push(`### ${r.message}`);
    lines.push(r.answer);
    lines.push("");
  }
  if (state.unknownFields.length > 0) {
    lines.push("## 아직 정해지지 않은 항목", "");
    lines.push(state.unknownFields.map((f) => `- ${f}`).join("\n"), "");
  }
  return lines.join("\n");
}

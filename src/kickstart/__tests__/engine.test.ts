import { describe, it, expect, vi } from "vitest";
import { runQuestions } from "../engine.js";
import type { KickstartQuestion, KickstartState, Answer, WizardIO } from "../types.js";
import { UNKNOWN } from "../schemas.js";

function newState(): KickstartState {
  return {
    version: "1.0", createdAt: "t", updatedAt: "t", status: "draft",
    projectType: "x", answers: {}, unknownFields: [], answered: [],
  };
}

function io(seq: Answer[]): WizardIO {
  let i = 0;
  return {
    print() {},
    async ask() { return seq[i++] ?? { kind: "cancel" }; },
    async finalAction() { return 0; },
    async confirm() { return true; },
  };
}

const Q: KickstartQuestion[] = [
  { id: "a", type: "single_select", message: "A", options: [{ label: "x", value: "x" }, { label: "모름", value: UNKNOWN }] },
  { id: "b", type: "multi_select", message: "B", options: [{ label: "p", value: "p" }, { label: "q", value: "q" }] },
  { id: "c", type: "text", message: "C", optional: true, condition: { field: "a", operator: "equals", value: "x" } },
];

describe("kickstart engine", () => {
  it("records single/multi/text and honors met condition", async () => {
    const s = newState();
    const persist = vi.fn();
    const r = await runQuestions(Q, io([
      { kind: "value", value: "x" },
      { kind: "value", value: ["p", "q"] },
      { kind: "value", value: "hello" },
    ]), s, persist);
    expect(r).toBe("done");
    expect(s.answers).toEqual({ a: "x", b: ["p", "q"], c: "hello" });
    expect(s.answered).toEqual(["a", "b", "c"]);
    expect(persist).toHaveBeenCalled();
  });

  it("skips question when condition not met + unknown recorded", async () => {
    const s = newState();
    const r = await runQuestions(Q, io([
      { kind: "value", value: UNKNOWN }, // a → unknown, so c (needs a===x) is skipped
      { kind: "value", value: [] },
    ]), s, () => {});
    expect(r).toBe("done");
    expect(s.answers.a).toBe(UNKNOWN);
    expect(s.unknownFields).toContain("a");
    expect(s.answers.c).toBeUndefined();
  });

  it("multi_select with UNKNOWN marks unknown and strips it", async () => {
    const s = newState();
    await runQuestions([Q[1]], io([{ kind: "value", value: ["p", UNKNOWN] }]), s, () => {});
    expect(s.answers.b).toEqual(["p"]);
    expect(s.unknownFields).toContain("b");
  });

  it("back re-asks the previous question and forgets its answer", async () => {
    const s = newState();
    const r = await runQuestions([Q[0], Q[1]], io([
      { kind: "value", value: "x" }, // a
      { kind: "back" },               // b → back → forget a, re-ask a
      { kind: "value", value: UNKNOWN }, // a again
      { kind: "value", value: ["p"] },   // b
    ]), s, () => {});
    expect(r).toBe("done");
    expect(s.answers.a).toBe(UNKNOWN);
    expect(s.answers.b).toEqual(["p"]);
  });

  it("back at first question returns 'back'", async () => {
    const s = newState();
    expect(await runQuestions(Q, io([{ kind: "back" }]), s, () => {})).toBe("back");
  });

  it("cancel returns 'cancel'", async () => {
    const s = newState();
    expect(await runQuestions(Q, io([{ kind: "cancel" }]), s, () => {})).toBe("cancel");
  });
});

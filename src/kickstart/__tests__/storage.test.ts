import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as store from "../storage.js";
import type { KickstartState } from "../types.js";

function mkState(): KickstartState {
  return {
    version: "1.0", createdAt: "2026-01-01", updatedAt: "2026-01-02", status: "draft",
    projectType: "dashboard",
    answers: { dashboardPurpose: "revenue", visualizations: ["cards", "bar"], targetUsers: "self" },
    unknownFields: ["refreshCycle"],
    answered: ["dashboardPurpose", "visualizations", "targetUsers"],
  };
}

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "ks-")); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe("kickstart storage", () => {
  it("draft save/load roundtrip", () => {
    const s = mkState();
    store.saveDraft(dir, s);
    expect(store.loadDraft(dir)).toEqual(s);
  });

  it("saveFinal writes json+md, clears draft, builds normalized record", () => {
    const s = mkState();
    store.saveDraft(dir, s);
    store.saveFinal(dir, { ...s, status: "confirmed" });
    expect(fs.existsSync(path.join(dir, ".agent", "kickstart.json"))).toBe(true);
    expect(fs.existsSync(path.join(dir, ".agent", "kickstart.md"))).toBe(true);
    expect(store.loadDraft(dir)).toBeNull(); // 초안 제거됨

    const j = store.loadFinal(dir)!;
    expect(j.projectType).toBe("dashboard");
    expect(j.status).toBe("confirmed");
    expect((j.requirements as Record<string, unknown>).dashboardPurpose).toBe("revenue");
    expect(j.unknownFields).toContain("refreshCycle");
  });

  it("finalExists + resetAll", () => {
    expect(store.finalExists(dir)).toBe(false);
    store.saveFinal(dir, mkState());
    expect(store.finalExists(dir)).toBe(true);
    store.resetAll(dir);
    expect(store.loadFinal(dir)).toBeNull();
    expect(store.finalExists(dir)).toBe(false);
  });

  it("loadDraft returns null when absent or corrupt", () => {
    expect(store.loadDraft(dir)).toBeNull();
    fs.mkdirSync(path.join(dir, ".agent"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".agent", "kickstart.draft.json"), "{ not json", "utf-8");
    expect(store.loadDraft(dir)).toBeNull();
  });
});

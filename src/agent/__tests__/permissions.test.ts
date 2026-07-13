import { describe, it, expect } from "vitest";
import { PermissionManager } from "../permissions.js";

describe("PermissionManager", () => {
  describe("safe mode", () => {
    it("always needs approval", () => {
      const pm = new PermissionManager("safe");
      expect(pm.needsApproval("file_read")).toBe(true);
      expect(pm.needsApproval("file_write")).toBe(true);
      expect(pm.needsApproval("shell_exec")).toBe(true);
    });

    it("still needs approval after approve() call", () => {
      const pm = new PermissionManager("safe");
      pm.approve("file_read");
      expect(pm.needsApproval("file_read")).toBe(true);
    });
  });

  describe("auto-approve mode", () => {
    it("needs approval initially", () => {
      const pm = new PermissionManager("auto-approve");
      expect(pm.needsApproval("file_write")).toBe(true);
    });

    it("skips approval after approve() for same category", () => {
      const pm = new PermissionManager("auto-approve");
      pm.approve("file_write");
      expect(pm.needsApproval("file_write")).toBe(false);
    });

    it("other categories still need approval", () => {
      const pm = new PermissionManager("auto-approve");
      pm.approve("file_write");
      expect(pm.needsApproval("shell_exec")).toBe(true);
    });
  });

  describe("yolo mode", () => {
    it("never needs approval", () => {
      const pm = new PermissionManager("yolo");
      expect(pm.needsApproval("file_read")).toBe(false);
      expect(pm.needsApproval("file_write")).toBe(false);
      expect(pm.needsApproval("shell_exec")).toBe(false);
    });
  });
});

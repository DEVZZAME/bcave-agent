export type PermissionCategory = "file_read" | "file_write" | "shell_exec";
export type PermissionMode = "safe" | "auto-approve" | "yolo";

export class PermissionManager {
  private mode: PermissionMode;
  private approved: Set<PermissionCategory> = new Set();

  constructor(mode: PermissionMode) {
    this.mode = mode;
  }

  needsApproval(category: PermissionCategory): boolean {
    if (this.mode === "yolo") return false;
    if (this.mode === "auto-approve" && this.approved.has(category)) return false;
    return true;
  }

  approve(category: PermissionCategory): void {
    if (this.mode === "auto-approve") {
      this.approved.add(category);
    }
  }
}

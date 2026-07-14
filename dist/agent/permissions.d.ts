export type PermissionCategory = "file_read" | "file_write" | "shell_exec";
export type PermissionMode = "safe" | "auto-approve" | "yolo";
export declare class PermissionManager {
    private mode;
    private approved;
    constructor(mode: PermissionMode);
    needsApproval(category: PermissionCategory): boolean;
    approve(category: PermissionCategory): void;
}

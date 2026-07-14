export class PermissionManager {
    mode;
    approved = new Set();
    constructor(mode) {
        this.mode = mode;
    }
    needsApproval(category) {
        if (this.mode === "yolo")
            return false;
        if (this.mode === "auto-approve" && this.approved.has(category))
            return false;
        return true;
    }
    approve(category) {
        if (this.mode === "auto-approve") {
            this.approved.add(category);
        }
    }
}

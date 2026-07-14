import { PermissionManager, type PermissionCategory } from "./permissions.js";
import { type BcaveConfig } from "../config/config.js";
export interface ToolCallRequest {
    id: string;
    name: string;
    args: Record<string, unknown>;
    category: PermissionCategory;
}
export type AgentEvent = {
    type: "text";
    content: string;
} | {
    type: "tool_call";
    request: ToolCallRequest;
} | {
    type: "tool_result";
    name: string;
    result: string;
} | {
    type: "done";
} | {
    type: "error";
    message: string;
};
export declare class ConversationManager {
    private client;
    private config;
    private permissions;
    private cwd;
    private messages;
    private pendingApprovals;
    constructor(config: BcaveConfig, permissions: PermissionManager, cwd: string);
    approveToolCall(id: string): void;
    rejectToolCall(id: string): void;
    /**
     * 게이트웨이 401(세션 만료) 시 Refresh Token 으로 갱신하고 새 client 반환.
     * 갱신 실패(만료/폐기) 시 null → 재로그인 필요.
     */
    private refreshSession;
    run(userMessage: string): AsyncGenerator<AgentEvent>;
}

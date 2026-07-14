import type { PermissionCategory } from "./permissions.js";
export interface ToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}
export declare const TOOL_DEFINITIONS: ToolDefinition[];
export declare function getToolCategory(name: string): PermissionCategory;
export declare function executeTool(name: string, args: Record<string, unknown>, cwd: string): Promise<string>;

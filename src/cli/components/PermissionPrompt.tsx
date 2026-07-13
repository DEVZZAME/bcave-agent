import React from "react";
import { Text, Box, useInput } from "ink";
import type { ToolCallRequest } from "../../agent/conversation.js";

interface Props {
  request: ToolCallRequest;
  isAutoApprove: boolean;
  onApprove: () => void;
  onAlways: () => void;
  onReject: () => void;
}

export function PermissionPrompt({ request, isAutoApprove, onApprove, onAlways, onReject }: Props) {
  useInput((input) => {
    const lower = input.toLowerCase();
    if (lower === "y" || lower === "") onApprove();
    else if (lower === "a") onAlways();
    else if (lower === "n") onReject();
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text color="yellow" bold>Permission Required</Text>
      <Text>
        <Text bold>{request.name}</Text>
        <Text dimColor>{" (" + request.category + ")"}</Text>
      </Text>
      <Box marginTop={1}>
        <Text dimColor>
          {JSON.stringify(request.args, null, 2)}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          {isAutoApprove
            ? "[Y]es / [A]lways for this category / [N]o"
            : "[Y]es / [N]o"}
        </Text>
      </Box>
    </Box>
  );
}

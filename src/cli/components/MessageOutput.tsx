import React from "react";
import { Text, Box } from "ink";

interface Props {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
}

export function MessageOutput({ role, content, toolName }: Props) {
  if (role === "user") {
    return (
      <Box marginBottom={1}>
        <Text color="green" bold>{"❯ "}</Text>
        <Text>{content}</Text>
      </Box>
    );
  }

  if (role === "tool") {
    return (
      <Box marginBottom={1} flexDirection="column">
        <Text color="yellow" dimColor>{"⚙ "}{toolName ?? "tool"}</Text>
        <Text dimColor>{content.length > 500 ? content.slice(0, 500) + "\n..." : content}</Text>
      </Box>
    );
  }

  return (
    <Box marginBottom={1}>
      <Text>{content}</Text>
    </Box>
  );
}

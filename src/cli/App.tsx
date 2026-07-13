import React, { useState, useEffect, useCallback } from "react";
import { Text, Box, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { ConversationManager, type AgentEvent, type ToolCallRequest } from "../agent/conversation.js";
import { PermissionManager, type PermissionMode } from "../agent/permissions.js";
import type { BcaveConfig } from "../config/config.js";
import { MessageOutput } from "./components/MessageOutput.js";
import { PermissionPrompt } from "./components/PermissionPrompt.js";

interface Props {
  config: BcaveConfig;
  mode: PermissionMode;
  initialPrompt?: string;
}

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
}

export function App({ config, mode, initialPrompt }: Props) {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<ToolCallRequest | null>(null);
  const [cm] = useState(() => {
    const pm = new PermissionManager(mode);
    return new ConversationManager(config, pm, process.cwd());
  });

  const processEvents = useCallback(async (gen: AsyncGenerator<AgentEvent>) => {
    for await (const event of gen) {
      switch (event.type) {
        case "text":
          setMessages((prev) => [...prev, { role: "assistant", content: event.content }]);
          break;
        case "tool_call":
          setPendingPermission(event.request);
          break;
        case "tool_result":
          setMessages((prev) => [
            ...prev,
            { role: "tool", content: event.result, toolName: event.name },
          ]);
          break;
        case "error":
          setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${event.message}` }]);
          break;
        case "done":
          break;
      }
    }
    setIsProcessing(false);
  }, []);

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text.trim() || isProcessing) return;
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setInput("");
      setIsProcessing(true);
      const gen = cm.run(text);
      processEvents(gen);
    },
    [cm, isProcessing, processEvents]
  );

  useEffect(() => {
    if (initialPrompt) {
      handleSubmit(initialPrompt);
    }
  }, []);

  useInput((_, key) => {
    if (key.ctrl && _.toLowerCase() === "c") {
      exit();
    }
  });

  const handleApprove = useCallback(() => {
    if (pendingPermission) {
      cm.approveToolCall(pendingPermission.id);
      setPendingPermission(null);
    }
  }, [cm, pendingPermission]);

  const handleAlways = useCallback(() => {
    if (pendingPermission) {
      cm.approveToolCall(pendingPermission.id);
      setPendingPermission(null);
    }
  }, [cm, pendingPermission]);

  const handleReject = useCallback(() => {
    if (pendingPermission) {
      cm.rejectToolCall(pendingPermission.id);
      setPendingPermission(null);
    }
  }, [cm, pendingPermission]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>BCave CLI</Text>
        <Text dimColor> — GPT-4o agent (mode: {mode})</Text>
      </Box>

      {messages.map((msg, i) => (
        <MessageOutput key={i} role={msg.role} content={msg.content} toolName={msg.toolName} />
      ))}

      {pendingPermission && (
        <PermissionPrompt
          request={pendingPermission}
          isAutoApprove={mode === "auto-approve"}
          onApprove={handleApprove}
          onAlways={handleAlways}
          onReject={handleReject}
        />
      )}

      {isProcessing && !pendingPermission && (
        <Text color="yellow">⏳ Thinking...</Text>
      )}

      {!isProcessing && (
        <Box>
          <Text color="green" bold>{"❯ "}</Text>
          <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
        </Box>
      )}
    </Box>
  );
}

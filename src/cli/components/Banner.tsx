import React from "react";
import { Text, Box } from "ink";

const BCAVE = [
  " ██████╗  ██████╗ █████╗ ██╗   ██╗███████╗",
  " ██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝",
  " ██████╔╝██║     ███████║██║   ██║█████╗  ",
  " ██╔══██╗██║     ██╔══██║╚██╗ ██╔╝██╔══╝  ",
  " ██████╔╝╚██████╗██║  ██║ ╚████╔╝ ███████╗",
  " ╚═════╝  ╚═════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝",
];

const CODE = [
  "  ██████╗ ██████╗ ██████╗ ███████╗",
  " ██╔════╝██╔═══██╗██╔══██╗██╔════╝",
  " ██║     ██║   ██║██║  ██║█████╗  ",
  " ██║     ██║   ██║██║  ██║██╔══╝  ",
  " ╚██████╗╚██████╔╝██████╔╝███████╗",
  "  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
];

export function Banner() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row">
        <Box flexDirection="column">
          {BCAVE.map((line, i) => (
            <Text key={i} color="cyan" bold>{line}</Text>
          ))}
        </Box>
        <Box flexDirection="column" marginLeft={1}>
          {CODE.map((line, i) => (
            <Text key={i} color="blue" bold>{line}</Text>
          ))}
        </Box>
      </Box>
      <Box marginTop={1} flexDirection="row" gap={2}>
        <Text color="cyan" dimColor>v0.1.0</Text>
        <Text color="gray">OpenAI GPT-4 기반 코딩 에이전트</Text>
      </Box>
      <Box marginTop={0} flexDirection="row">
        <Text dimColor>/help 로 사용 가능한 명령어를 확인하세요</Text>
      </Box>
    </Box>
  );
}

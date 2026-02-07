import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from './Spinner.js';
import type { CodingAgent, AgentType } from '../hooks/useCodingAgents.js';

interface CodingAgentCardProps {
  agent: CodingAgent;
  boxWidth: number;
}

function getIcon(type: AgentType): string {
  switch (type) {
    case 'CC': return '\u{1F916}';   // robot
    case 'GHCP': return '\u{1F419}'; // octopus
    case 'Codex': return '\u{1F4E6}'; // package
  }
}

function getLabel(type: AgentType): string {
  switch (type) {
    case 'CC': return 'Claude Code';
    case 'GHCP': return 'GH Copilot';
    case 'Codex': return 'Codex';
  }
}

export function CodingAgentCard({ agent, boxWidth }: CodingAgentCardProps) {
  const icon = getIcon(agent.type);
  const label = getLabel(agent.type);
  const pidStr = `PID ${agent.pid}`;

  // Line 1: │ icon(2) space label  spinner(1+1) pidStr  elapsed padding │
  const spinnerWidth = 2; // spinner char + space
  const line1ContentWidth = 2 + 1 + label.length + 2 + spinnerWidth + pidStr.length + 2 + agent.elapsed.length;
  const line1Padding = Math.max(1, boxWidth - line1ContentWidth);

  // Line 2: │   └─ command padding │
  const line2ContentWidth = 6 + agent.command.length;
  const line2Padding = Math.max(1, boxWidth - line2ContentWidth);

  return (
    <Box flexDirection="column">
      <Text>
        <Text dimColor>{'│'}</Text>
        <Text color="magenta">{icon}</Text>
        <Text> </Text>
        <Text bold color="magenta">{label}</Text>
        <Text>{'  '}</Text>
        <Spinner />
        <Text> </Text>
        <Text color="magenta">{pidStr}</Text>
        <Text>{'  '}</Text>
        <Text dimColor>{agent.elapsed}</Text>
        <Text dimColor>{' '.repeat(line1Padding)}{'│'}</Text>
      </Text>
      <Text>
        <Text dimColor>{'│   └─ '}</Text>
        <Text dimColor>{agent.command}</Text>
        <Text dimColor>{' '.repeat(line2Padding)}{'│'}</Text>
      </Text>
    </Box>
  );
}

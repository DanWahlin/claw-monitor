import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  stats: {
    total: number;
    running: number;
    complete: number;
    failed: number;
  };
  codingAgentCount?: number;
  boxWidth: number;
}

export function Footer({ stats, codingAgentCount = 0, boxWidth }: FooterProps) {
  // Build stats string to calculate padding
  const agentWord = stats.total !== 1 ? 'agents' : 'agent';
  const codingSuffix = codingAgentCount > 0 ? ` │ ${codingAgentCount} coding` : '';
  const statsContent = `  ${stats.total} ${agentWord} │ ${stats.running} running │ ${stats.complete} complete │ ${stats.failed} failed${codingSuffix}`;
  const padding = Math.max(0, boxWidth - 2 - statsContent.length);

  return (
    <Box flexDirection="column">
      <Text dimColor>{'─'.repeat(boxWidth)}</Text>
      <Text>
        <Text dimColor>{'   '}</Text>
        <Text bold>{stats.total}</Text>
        <Text dimColor>{' '}{agentWord}</Text>
        <Text dimColor>{' │ '}</Text>
        <Text color="cyan" bold>{stats.running}</Text>
        <Text dimColor>{' running'}</Text>
        <Text dimColor>{' │ '}</Text>
        <Text color="green" bold>{stats.complete}</Text>
        <Text dimColor>{' complete'}</Text>
        <Text dimColor>{' │ '}</Text>
        <Text color="red" bold>{stats.failed}</Text>
        <Text dimColor>{' failed'}</Text>
        {codingAgentCount > 0 && (
          <>
            <Text dimColor>{' │ '}</Text>
            <Text color="magenta" bold>{codingAgentCount}</Text>
            <Text dimColor>{' coding'}</Text>
          </>
        )}
        <Text dimColor>{' '.repeat(padding)}</Text>
      </Text>
      <Text dimColor>{'─'.repeat(boxWidth)}</Text>
    </Box>
  );
}

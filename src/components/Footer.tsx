import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  stats: {
    total: number;
    running: number;
    complete: number;
    failed: number;
  };
}

export function Footer({ stats }: FooterProps) {
  const boxWidth = 64;
  const innerWidth = boxWidth - 2;

  // Build stats string to calculate padding
  const agentWord = stats.total !== 1 ? 'agents' : 'agent';
  const statsContent = `  ${stats.total} ${agentWord} │ ${stats.running} running │ ${stats.complete} complete │ ${stats.failed} failed`;
  const padding = Math.max(0, innerWidth - statsContent.length);

  return (
    <Box flexDirection="column">
      <Text dimColor>{'├' + '─'.repeat(innerWidth) + '┤'}</Text>
      <Text>
        <Text dimColor>{'│  '}</Text>
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
        <Text dimColor>{' '.repeat(padding) + '│'}</Text>
      </Text>
      <Text dimColor>{'└' + '─'.repeat(innerWidth) + '┘'}</Text>
    </Box>
  );
}

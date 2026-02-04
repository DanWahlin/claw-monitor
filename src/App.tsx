import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { useSubAgents } from './hooks/useSubAgents.js';
import { AgentCard } from './components/AgentCard.js';
import { Footer } from './components/Footer.js';

// Check if we have TTY support
const isTTY = process.stdin.isTTY ?? false;

export function App() {
  const [showAll, setShowAll] = useState(false);
  const { agents, stats, error } = useSubAgents(showAll);
  const { exit } = useApp();
  const { write } = useStdout();

  // Clear screen when toggling to handle height changes
  useEffect(() => {
    // ANSI escape: move to top-left and clear screen
    write('\x1b[H\x1b[2J');
  }, [showAll, write]);

  // Handle keyboard input only when TTY is available
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
    if (input === 'q') {
      exit();
    }
    if (input === 'a') {
      setShowAll(!showAll);
    }
  }, { isActive: isTTY });

  const boxWidth = 64;
  const innerWidth = boxWidth - 2; // 62 chars between borders
  const horizontalLine = '─'.repeat(innerWidth);

  // Helper to pad content to fill the box
  const padLine = (text: string, extraPad: number = 0) => {
    const padding = innerWidth - text.length - extraPad;
    return padding > 0 ? ' '.repeat(padding) : '';
  };

  return (
    <Box flexDirection="column" padding={0}>
      {/* Header */}
      <Text>
        <Text dimColor>{'┌─ '}</Text>
        <Text color="red">🦞</Text>
        <Text bold> claw-monitor </Text>
        <Text dimColor>{'─'.repeat(innerWidth - 18)}{'┐'}</Text>
      </Text>
      <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>

      {/* Error state */}
      {error && (
        <Text>
          <Text dimColor>{'│  '}</Text>
          <Text color="yellow">{'⚠  '}{error}</Text>
          <Text dimColor>{padLine('  ⚠  ' + error) + '│'}</Text>
        </Text>
      )}

      {/* Empty state */}
      {!error && agents.length === 0 && (
        <Box flexDirection="column">
          <Text>
            <Text dimColor>{'│  '}</Text>
            <Text color="green">No running sessions.</Text>
            <Text dimColor>{padLine('  No running sessions.') + '│'}</Text>
          </Text>
          <Text>
            <Text dimColor>{'│  Press '}</Text>
            <Text color="cyan">a</Text>
            <Text dimColor>{' to show recent history.'}</Text>
            <Text dimColor>{padLine('  Press a to show recent history.') + '│'}</Text>
          </Text>
        </Box>
      )}

      {/* Agent list */}
      {agents.length > 0 && (
        <Box flexDirection="column">
          {agents.map((agent) => (
            <Box key={agent.filePath} flexDirection="column">
              <AgentCard agent={agent} boxWidth={innerWidth} />
              <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>
            </Box>
          ))}
        </Box>
      )}

      <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>

      {/* Footer */}
      <Footer stats={stats} />

      {/* Help hint */}
      <Box marginTop={1}>
        <Text>
          <Text dimColor>{'Press '}</Text>
          <Text color="cyan">{'q'}</Text>
          <Text dimColor>{' to quit | '}</Text>
          <Text color="cyan">{'a'}</Text>
          <Text dimColor>{' to toggle '}</Text>
          <Text color={showAll ? 'green' : 'yellow'}>{showAll ? 'all' : 'running only'}</Text>
        </Text>
      </Box>
    </Box>
  );
}

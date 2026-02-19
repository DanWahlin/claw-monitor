import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { useSubAgents } from './hooks/useSubAgents.js';
import { useCodingAgents } from './hooks/useCodingAgents.js';
import { useCronJobs } from './hooks/useCronJobs.js';
import { AgentCard } from './components/AgentCard.js';
import { CodingAgentCard } from './components/CodingAgentCard.js';
import { CronSection } from './components/CronSection.js';
import { Footer } from './components/Footer.js';

// Check if we have TTY support
const isTTY = process.stdin.isTTY ?? false;

export function App() {
  const [showAll, setShowAll] = useState(false);
  const { agents, stats, error } = useSubAgents(showAll);
  const { agents: codingAgents, stats: codingStats } = useCodingAgents();
  const { jobs: cronJobs, stats: cronStats } = useCronJobs();
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

  const boxWidth = 78;
  const innerWidth = boxWidth - 2; // 76 chars between borders
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

      {/* Coding Agents section */}
      {codingAgents.length > 0 && (
        <Box flexDirection="column">
          <Text>
            <Text dimColor>{'│  '}</Text>
            <Text bold color="magenta">Coding Agents</Text>
            <Text dimColor>{' ('}</Text>
            <Text color="magenta" bold>{String(codingStats.total)}</Text>
            <Text dimColor>{')'}</Text>
            <Text dimColor>{' '.repeat(Math.max(1, innerWidth - 2 - 14 - 2 - String(codingStats.total).length - 1)) + '│'}</Text>
          </Text>
          <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>
          {codingAgents.map((agent) => (
            <Box key={`${agent.type}-${agent.pid}`} flexDirection="column">
              <CodingAgentCard agent={agent} boxWidth={innerWidth} />
              <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>
            </Box>
          ))}
          <Text dimColor>{'├' + '─'.repeat(innerWidth) + '┤'}</Text>
          <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Text>
          <Text dimColor>{'│  '}</Text>
          <Text color="yellow">{'⚠  '}{error}</Text>
          <Text dimColor>{padLine('  ⚠  ' + error) + '│'}</Text>
        </Text>
      )}

      {/* Sub-Agents section header */}
      {(agents.length > 0 || (!error && agents.length === 0)) && (
        <Text>
          <Text dimColor>{'│  '}</Text>
          <Text bold color="cyan">Sub-Agents</Text>
          <Text dimColor>{' ('}</Text>
          <Text color="cyan" bold>{String(stats.total)}</Text>
          <Text dimColor>{')'}</Text>
          <Text dimColor>{' '.repeat(Math.max(1, innerWidth - 2 - 10 - 2 - String(stats.total).length - 1)) + '│'}</Text>
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
          <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>
          {agents.map((agent) => (
            <Box key={agent.filePath} flexDirection="column">
              <AgentCard agent={agent} boxWidth={innerWidth} />
              <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>
            </Box>
          ))}
        </Box>
      )}

      <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>

      {/* Cron Jobs section */}
      {cronJobs.length > 0 && (
        <Box flexDirection="column">
          <Text dimColor>{'├' + '─'.repeat(innerWidth) + '┤'}</Text>
          <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>
          <CronSection jobs={cronJobs} stats={cronStats} boxWidth={innerWidth} />
          <Text dimColor>{'│' + ' '.repeat(innerWidth) + '│'}</Text>
        </Box>
      )}

      {/* Footer */}
      <Footer stats={stats} codingAgentCount={codingStats.total} />

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

      {/* Attach commands */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>{'Attach to coding agents:'}</Text>
        <Text>
          <Text color="cyan">{'  cc-attach      '}</Text>
          <Text dimColor>{'Claude Code (Opus 4.6)'}</Text>
        </Text>
        <Text>
          <Text color="cyan">{'  copilot-attach  '}</Text>
          <Text dimColor>{'GitHub Copilot (GPT-5 / Sonnet / Gemini)'}</Text>
        </Text>
        <Text>
          <Text color="cyan">{'  codex-attach    '}</Text>
          <Text dimColor>{'Codex (GPT-5.2)'}</Text>
        </Text>
        <Text dimColor>{'  Detach: Ctrl+B then D'}</Text>
      </Box>
    </Box>
  );
}

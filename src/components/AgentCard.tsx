import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from './Spinner.js';
import { SessionData, formatElapsed } from '../utils/parseSession.js';

interface AgentCardProps {
  agent: SessionData;
  boxWidth: number;
}

export function AgentCard({ agent, boxWidth }: AgentCardProps) {
  const { label, status, elapsed, currentTool, toolArgs, toolCount } = agent;

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return '🔵';
      case 'complete': return '✅';
      case 'failed': return '❌';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'cyan';
      case 'complete': return 'green';
      case 'failed': return 'red';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running': return 'running';
      case 'complete': return 'complete';
      case 'failed': return 'failed';
    }
  };

  const getDetailText = () => {
    if (status === 'running' && currentTool) {
      const toolDisplay = currentTool.length > 10 ? currentTool.substring(0, 7) + '...' : currentTool;
      const argsDisplay = toolArgs 
        ? `: "${toolArgs.substring(0, 25)}${toolArgs.length > 25 ? '...' : ''}"`
        : '';
      return `${toolDisplay}${argsDisplay}`;
    }
    return `Finished with ${toolCount} tool call${toolCount !== 1 ? 's' : ''}`;
  };

  // Clean up label - remove common prefixes
  let cleanLabel = label
    .replace(/^\[.*?\]\s*/, '') // Remove timestamp prefixes like [Wed 2026-...]
    .replace(/^(Deep research task|Search the internet for|I'd like you to)[:\s]+/i, '')
    .replace(/^(Are you there|Any updates|OK|Hi|Hello)[?\s]*/i, '')
    .trim();
  
  // Truncate to fit
  const maxLabelLen = 28;
  const displayLabel = cleanLabel.length > maxLabelLen 
    ? cleanLabel.substring(0, maxLabelLen - 3) + '...' 
    : cleanLabel;

  const statusText = getStatusText();
  const elapsedStr = formatElapsed(elapsed);
  const detailText = getDetailText();

  // Calculate widths carefully
  // Line 1: │ + emoji(2) + space + label + 2spaces + [spinner(1) + space if running] + status + 2spaces + elapsed + padding + │
  // Emoji counts as 2 visual columns
  const spinnerWidth = status === 'running' ? 2 : 0; // spinner + space
  const line1ContentWidth = 2 + 1 + displayLabel.length + 2 + spinnerWidth + statusText.length + 2 + elapsedStr.length;
  const line1Padding = Math.max(1, boxWidth - line1ContentWidth);

  // Line 2: │ + 3spaces + └─ + space + detail + padding + │
  const line2ContentWidth = 6 + detailText.length;
  const line2Padding = Math.max(1, boxWidth - line2ContentWidth);

  return (
    <Box flexDirection="column">
      <Text>
        <Text dimColor>{'│'}</Text>
        <Text color={getStatusColor()}>{getStatusIcon()}</Text>
        <Text> </Text>
        <Text bold color={getStatusColor()}>{displayLabel}</Text>
        <Text>{'  '}</Text>
        {status === 'running' && <><Spinner /><Text> </Text></>}
        <Text color={getStatusColor()}>{statusText}</Text>
        <Text>{'  '}</Text>
        <Text dimColor>{elapsedStr}</Text>
        <Text dimColor>{' '.repeat(line1Padding)}{'│'}</Text>
      </Text>
      <Text>
        <Text dimColor>{'│   └─ '}</Text>
        <Text dimColor>{detailText}</Text>
        <Text dimColor>{' '.repeat(line2Padding)}{'│'}</Text>
      </Text>
    </Box>
  );
}

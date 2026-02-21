import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from './Spinner.js';
import { SessionData, formatElapsed } from '../utils/parseSession.js';

interface AgentCardProps {
  agent: SessionData;
  boxWidth: number;
  isSelected?: boolean;
  isExpanded?: boolean;
}

export function AgentCard({ agent, boxWidth, isSelected = false, isExpanded = false }: AgentCardProps) {
  const { label, status, elapsed, currentTool, toolArgs, toolCount, recentTools, errorDetails } = agent;

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
  // Line 1: │(1) + emoji(2 visual, 1 JS) + space(1) + label + 2spaces + [spinner+space if running] + status + 2spaces + elapsed + padding + │
  const emojiOffset = 1; // emoji is 2 visual cols but 1 JS char
  const spinnerWidth = status === 'running' ? 2 : 0; // spinner + space
  const line1ContentWidth = 1 + 1 + 1 + displayLabel.length + 2 + spinnerWidth + statusText.length + 2 + elapsedStr.length;
  const line1Padding = Math.max(1, boxWidth - line1ContentWidth - emojiOffset);

  // Line 2: │ + 3spaces + └─ + space + detail + padding + │
  const line2ContentWidth = 6 + detailText.length;
  const line2Padding = Math.max(1, boxWidth - line2ContentWidth);

  // Selection indicator: ▸ when selected, space otherwise
  const sel = isSelected ? '▸' : ' ';

  return (
    <Box flexDirection="column">
      <Text>
        <Text dimColor>{' '}</Text>
        <Text color={isSelected ? 'cyan' : undefined}>{sel}</Text>
        <Text color={getStatusColor()}>{getStatusIcon()}</Text>
        <Text> </Text>
        <Text bold color={getStatusColor()}>{displayLabel}</Text>
        <Text>{'  '}</Text>
        {status === 'running' && <><Spinner /><Text> </Text></>}
        <Text color={getStatusColor()}>{statusText}</Text>
        <Text>{'  '}</Text>
        <Text dimColor>{elapsedStr}</Text>
        <Text dimColor>{' '.repeat(Math.max(1, line1Padding - 1))}</Text>
      </Text>
      <Text>
        <Text dimColor>{'    └─ '}</Text>
        <Text dimColor>{detailText}</Text>
        <Text dimColor>{' '.repeat(line2Padding)}</Text>
      </Text>

      {/* Expanded detail view */}
      {isExpanded && (
        <>
          {/* Full label */}
          {cleanLabel.length > maxLabelLen && (() => {
            const fullText = `     ${cleanLabel}`;
            const fPad = Math.max(0, boxWidth - fullText.length);
            return (
              <Text>
                <Text dimColor>{' '}</Text>
                <Text dimColor>{fullText}</Text>
                <Text dimColor>{' '.repeat(fPad)}</Text>
              </Text>
            );
          })()}

          {/* Recent tool calls */}
          {recentTools.length > 0 && (
            <>
              {(() => {
                const hdr = '     Recent tools:';
                const hPad = Math.max(0, boxWidth - hdr.length);
                return (
                  <Text>
                    <Text dimColor>{' '}</Text>
                    <Text color="cyan">{hdr}</Text>
                    <Text dimColor>{' '.repeat(hPad)}</Text>
                  </Text>
                );
              })()}
              {recentTools.map((t, i) => {
                const tLine = `       ${i + 1}. ${t}`;
                const tPad = Math.max(0, boxWidth - tLine.length);
                return (
                  <Text key={i}>
                    <Text dimColor>{' '}</Text>
                    <Text dimColor>{tLine}</Text>
                    <Text dimColor>{' '.repeat(tPad)}</Text>
                  </Text>
                );
              })}
            </>
          )}

          {/* Error details */}
          {errorDetails && (() => {
            const errText = `     Error: ${errorDetails}`;
            const truncErr = errText.length > boxWidth ? errText.substring(0, boxWidth - 1) + '~' : errText;
            const ePad = Math.max(0, boxWidth - truncErr.length);
            return (
              <Text>
                <Text dimColor>{' '}</Text>
                <Text color="red">{truncErr}</Text>
                <Text dimColor>{' '.repeat(ePad)}</Text>
              </Text>
            );
          })()}
        </>
      )}
    </Box>
  );
}

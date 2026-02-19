import React from 'react';
import { Box, Text } from 'ink';
import type { SysStats } from '../hooks/useSysStats.js';

interface SysStatsProps {
  stats: SysStats;
  boxWidth: number;
}

function barColor(percent: number): string {
  if (percent >= 90) return 'red';
  if (percent >= 70) return 'yellow';
  return 'green';
}

function renderBar(
  label: string,
  percent: number,
  detail: string,
  barWidth: number,
  boxWidth: number,
): JSX.Element {
  const filled = Math.round((percent / 100) * barWidth);
  const empty = barWidth - filled;
  const color = barColor(percent);

  const pctStr = `${percent}%`.padStart(4);

  // Build content: "  LABEL [████░░░░] pct%  detail"
  // label(5) + space(1) + [(1) + bar(barWidth) + ](1) + space(1) + pct(4) + space(2) + detail
  const contentLen = 2 + label.length + 1 + 1 + barWidth + 1 + 1 + pctStr.length + 2 + detail.length;
  const pad = Math.max(0, boxWidth - contentLen);

  return (
    <Text key={label}>
      <Text dimColor>{'│  '}</Text>
      <Text bold>{label}</Text>
      <Text>{' '}</Text>
      <Text dimColor>{'['}</Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text dimColor>{']'}</Text>
      <Text>{' '}</Text>
      <Text bold color={color}>{pctStr}</Text>
      <Text>{'  '}</Text>
      <Text dimColor>{detail}</Text>
      <Text dimColor>{' '.repeat(pad) + '│'}</Text>
    </Text>
  );
}

export function SysStatsSection({ stats, boxWidth }: SysStatsProps) {
  const barWidth = 20;

  const cpuDetail = `${stats.cpu.cores} cores`;
  const memDetail = `${stats.mem.usedGB} / ${stats.mem.totalGB} GB`;
  const diskDetail = `${stats.disk.usedGB} / ${stats.disk.totalGB} GB`;

  return (
    <Box flexDirection="column">
      <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>
      {renderBar('CPU ', stats.cpu.percent, cpuDetail, barWidth, boxWidth)}
      <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>
      {renderBar('MEM ', stats.mem.percent, memDetail, barWidth, boxWidth)}
      <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>
      {renderBar('DISK', stats.disk.percent, diskDetail, barWidth, boxWidth)}
    </Box>
  );
}

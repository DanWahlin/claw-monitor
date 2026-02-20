import React from 'react';
import { Box, Text } from 'ink';
import type { SysStats } from '../hooks/useSysStats.js';
import { WARN_THRESHOLD, CRIT_THRESHOLD, BAR_WIDTH } from '../utils/config.js';

interface SysStatsProps {
  stats: SysStats;
  boxWidth: number;
}

function barColor(percent: number): string {
  if (percent >= CRIT_THRESHOLD) return 'red';
  if (percent >= WARN_THRESHOLD) return 'yellow';
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
  // Scale bar width with terminal: ~26% of inner width, clamped to [12, BAR_WIDTH]
  const barWidth = Math.max(12, Math.min(BAR_WIDTH, Math.floor(boxWidth * 0.26)));

  const cpuDetail = `${stats.cpu.cores} cores`;
  const memDetail = `${stats.mem.usedGB} / ${stats.mem.totalGB} GB`;
  const diskDetail = `${stats.disk.usedGB} / ${stats.disk.totalGB} GB`;

  const gpuDetail = stats.gpu
    ? `${stats.gpu.memUsedMB} / ${stats.gpu.memTotalMB} MB`
    : '';

  const dockerText = stats.docker.available
    ? `  🐳 ${stats.docker.running} container${stats.docker.running !== 1 ? 's' : ''} running`
    : '';
  const dockerPad = dockerText ? Math.max(0, boxWidth - dockerText.length) : 0;

  return (
    <Box flexDirection="column">
      <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>
      {renderBar('CPU ', stats.cpu.percent, cpuDetail, barWidth, boxWidth)}
      <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>
      {renderBar('MEM ', stats.mem.percent, memDetail, barWidth, boxWidth)}
      <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>
      {renderBar('DISK', stats.disk.percent, diskDetail, barWidth, boxWidth)}

      {/* GPU bar (only when nvidia-smi is available) */}
      {stats.gpu && (
        <>
          <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>
          {renderBar('GPU ', stats.gpu.percent, gpuDetail, barWidth, boxWidth)}
        </>
      )}

      {/* Docker container count */}
      {stats.docker.available && stats.docker.running > 0 && (
        <>
          <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>
          <Text>
            <Text dimColor>{'│'}</Text>
            <Text dimColor>{dockerText}</Text>
            <Text dimColor>{' '.repeat(dockerPad) + '│'}</Text>
          </Text>
        </>
      )}

      {/* Warnings from failed stat commands */}
      {stats.warnings.length > 0 && (
        <>
          <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>
          {stats.warnings.map((w, i) => {
            const warnText = `  ⚠ ${w}`;
            const wPad = Math.max(0, boxWidth - warnText.length);
            return (
              <Text key={i}>
                <Text dimColor>{'│'}</Text>
                <Text color="yellow">{warnText}</Text>
                <Text dimColor>{' '.repeat(wPad) + '│'}</Text>
              </Text>
            );
          })}
        </>
      )}
    </Box>
  );
}

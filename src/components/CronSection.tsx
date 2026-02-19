import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from './Spinner.js';
import type { CronJob, CronStats } from '../hooks/useCronJobs.js';

interface CronSectionProps {
  jobs: CronJob[];
  stats: CronStats;
  boxWidth: number;
}

function statusIcon(job: CronJob): string {
  if (job.isRunning) return '⏳';
  if (job.consecutiveErrors > 0) return '❌';
  if (job.lastStatus === 'ok') return '✅';
  if (job.lastStatus === 'none') return '⬚ ';
  return '⬚ ';
}

function statusColor(job: CronJob): string {
  if (job.isRunning) return 'yellow';
  if (job.consecutiveErrors > 0) return 'red';
  if (job.lastStatus === 'ok') return 'green';
  return 'gray';
}

// Truncate or pad a string to exact width
function fit(text: string, width: number): string {
  if (text.length > width) return text.substring(0, width - 1) + '…';
  return text.padEnd(width);
}

export function CronSection({ jobs, stats, boxWidth }: CronSectionProps) {
  // Column widths
  const nameW = 24;
  const schedW = 16;
  const nextW = 10;
  const durW = 7;
  // Remaining space for right padding

  return (
    <Box flexDirection="column">
      {/* Section header */}
      <Text>
        <Text dimColor>{'│  '}</Text>
        <Text bold color="yellow">Cron Jobs</Text>
        <Text dimColor>{' ('}</Text>
        <Text color="yellow" bold>{String(stats.total)}</Text>
        <Text dimColor>{')'}</Text>
        {stats.erroring > 0 && (
          <>
            <Text dimColor>{' · '}</Text>
            <Text color="red" bold>{String(stats.erroring)}</Text>
            <Text color="red">{' failing'}</Text>
          </>
        )}
        {stats.running > 0 && (
          <>
            <Text dimColor>{' · '}</Text>
            <Text color="yellow" bold>{String(stats.running)}</Text>
            <Text color="yellow">{' running'}</Text>
          </>
        )}
        <Text dimColor>{' '.repeat(Math.max(1, boxWidth - 2 - 9 - 2 - String(stats.total).length - 1
          - (stats.erroring > 0 ? 3 + String(stats.erroring).length + 8 : 0)
          - (stats.running > 0 ? 3 + String(stats.running).length + 8 : 0)
        )) + '│'}</Text>
      </Text>
      <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>

      {/* Column headers */}
      <Text>
        <Text dimColor>{'│  '}</Text>
        <Text dimColor>{fit('Name', nameW)}</Text>
        <Text dimColor>{fit('Schedule', schedW)}</Text>
        <Text dimColor>{fit('Next', nextW)}</Text>
        <Text dimColor>{fit('Last', durW)}</Text>
        <Text dimColor>{' '.repeat(Math.max(1, boxWidth - 2 - nameW - schedW - nextW - durW)) + '│'}</Text>
      </Text>

      {/* Job rows */}
      {jobs.map(job => {
        const icon = statusIcon(job);
        const color = statusColor(job);
        const errSuffix = job.consecutiveErrors > 1 ? ` (${job.consecutiveErrors}x)` : '';
        const durText = job.lastStatus === 'error' ? 'err' + errSuffix : job.lastDuration;

        // Icon is 2 visual chars, so name column starts after icon+space
        const nameText = fit(job.name, nameW - 3); // 3 = icon(2) + space(1)
        const schedText = fit(job.schedule, schedW);
        const nextText = fit(job.nextRun, nextW);
        const durDisplay = fit(durText, durW + errSuffix.length);

        const contentLen = 2 + 2 + 1 + nameText.length + schedText.length + nextText.length + durDisplay.length;
        const rowPad = Math.max(1, boxWidth - contentLen);

        return (
          <Text key={job.id}>
            <Text dimColor>{'│ '}</Text>
            <Text color={color}>{icon}</Text>
            <Text> </Text>
            {job.isRunning ? (
              <>
                <Text bold color="yellow">{nameText}</Text>
              </>
            ) : (
              <Text color={job.consecutiveErrors > 0 ? 'red' : undefined}>{nameText}</Text>
            )}
            <Text dimColor>{schedText}</Text>
            <Text dimColor>{nextText}</Text>
            <Text color={job.consecutiveErrors > 0 ? 'red' : 'gray'}>{durDisplay}</Text>
            <Text dimColor>{' '.repeat(rowPad) + '│'}</Text>
          </Text>
        );
      })}
    </Box>
  );
}

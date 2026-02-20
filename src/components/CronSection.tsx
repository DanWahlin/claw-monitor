import React from 'react';
import { Box, Text } from 'ink';
import type { CronJob, CronStats } from '../hooks/useCronJobs.js';

interface CronSectionProps {
  jobs: CronJob[];
  stats: CronStats;
  boxWidth: number;
}

// Pure ASCII status indicators — no emoji, no width ambiguity
function statusChar(job: CronJob): string {
  if (job.isRunning) return '>';
  if (job.consecutiveErrors > 0) return '!';
  if (job.lastStatus === 'ok') return '*';
  return '-';
}

function statusColor(job: CronJob): string {
  if (job.isRunning) return 'yellow';
  if (job.consecutiveErrors > 0) return 'red';
  if (job.lastStatus === 'ok') return 'green';
  return 'gray';
}

// Truncate or pad a string to exact width
function fit(text: string, width: number): string {
  if (text.length > width) return text.substring(0, width - 1) + '~';
  return text.padEnd(width);
}

export function CronSection({ jobs, stats, boxWidth }: CronSectionProps) {
  // Column widths: indicator(1) + space(1) + name + space(1) + sched + next + dur
  const nameW = 18;
  const schedW = 18;
  const modelW = 18;
  const nextW = 10;
  const durW = 8;

  // Build header line as plain string, pad to boxWidth
  const headerText = '  ' + fit('Name', nameW) + ' ' + fit('Schedule', schedW) + fit('Model', modelW) + fit('Next', nextW) + fit('Last', durW);
  const headerPad = Math.max(0, boxWidth - headerText.length);

  // Section header
  const errPart = stats.erroring > 0 ? ` · ${stats.erroring} failing` : '';
  const runPart = stats.running > 0 ? ` · ${stats.running} running` : '';
  const titleText = `  Cron Jobs (${stats.total})${errPart}${runPart}`;
  const titlePad = Math.max(0, boxWidth - titleText.length);

  return (
    <Box flexDirection="column">
      {/* Section header */}
      <Text>
        <Text dimColor>{'│'}</Text>
        <Text bold color="yellow">{'  Cron Jobs'}</Text>
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
        <Text dimColor>{' '.repeat(titlePad) + '│'}</Text>
      </Text>
      <Text dimColor>{'│' + ' '.repeat(boxWidth) + '│'}</Text>

      {/* Column headers */}
      <Text>
        <Text dimColor>{'│' + headerText + ' '.repeat(headerPad) + '│'}</Text>
      </Text>

      {/* Job rows */}
      {jobs.map(job => {
        const ch = statusChar(job);
        const color = statusColor(job);
        const errSuffix = job.consecutiveErrors > 1 ? ` (${job.consecutiveErrors}x)` : '';
        const durText = job.lastStatus === 'error' ? 'err' + errSuffix : job.lastDuration;

        // Build the full row as a plain string so padding is exact
        const rowText = ' ' + ch + ' ' + fit(job.name, nameW) + ' ' + fit(job.schedule, schedW) + fit(job.model, modelW) + fit(job.nextRun, nextW) + fit(durText, durW);
        const rowPad = Math.max(0, boxWidth - rowText.length);

        return (
          <Text key={job.id}>
            <Text dimColor>{'│'}</Text>
            <Text>{' '}</Text>
            <Text bold color={color}>{ch}</Text>
            <Text>{' '}</Text>
            {job.consecutiveErrors > 0 ? (
              <Text color="red">{fit(job.name, nameW)}</Text>
            ) : job.isRunning ? (
              <Text bold color="yellow">{fit(job.name, nameW)}</Text>
            ) : (
              <Text>{fit(job.name, nameW)}</Text>
            )}
            <Text>{' '}</Text>
            <Text dimColor>{fit(job.schedule, schedW)}</Text>
            <Text dimColor>{fit(job.model, modelW)}</Text>
            <Text dimColor>{fit(job.nextRun, nextW)}</Text>
            <Text color={job.consecutiveErrors > 0 ? 'red' : 'gray'}>{fit(durText, durW)}</Text>
            <Text dimColor>{' '.repeat(rowPad) + '│'}</Text>
          </Text>
        );
      })}
    </Box>
  );
}

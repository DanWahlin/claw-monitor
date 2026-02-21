import React from 'react';
import { Box, Text } from 'ink';
import type { SystemCronJob, SystemCronStats } from '../hooks/useSystemCron.js';
import { fit } from '../utils/cronUtils.js';

interface SystemCronSectionProps {
  jobs: SystemCronJob[];
  stats: SystemCronStats;
  boxWidth: number;
}

export function SystemCronSection({ jobs, stats, boxWidth }: SystemCronSectionProps) {
  const nameW = 24;
  const schedW = 24;
  const nextW = 12;
  const lastW = 8;

  const headerText = '  ' + fit('Name', nameW) + ' ' + fit('Schedule', schedW) + fit('Next', nextW) + fit('Last', lastW);
  const headerPad = Math.max(0, boxWidth - headerText.length);

  const titleText = `  System Cron (${stats.total})`;
  const titlePad = Math.max(0, boxWidth - titleText.length);

  return (
    <Box flexDirection="column">
      {/* Section header */}
      <Text>
        <Text dimColor>{' '}</Text>
        <Text bold color="blue">{'  System Cron'}</Text>
        <Text dimColor>{' ('}</Text>
        <Text color="blue" bold>{String(stats.total)}</Text>
        <Text dimColor>{')'}</Text>
        <Text dimColor>{' '.repeat(titlePad)}</Text>
      </Text>
      <Text>{' '}</Text>

      {/* Column headers */}
      <Text>
        <Text dimColor>{' ' + headerText + ' '.repeat(headerPad)}</Text>
      </Text>

      {/* Job rows */}
      {jobs.map(job => {
        const rowText = ' - ' + fit(job.name, nameW) + ' ' + fit(job.schedule, schedW) + fit(job.nextRun, nextW) + fit('—', lastW);
        const rowPad = Math.max(0, boxWidth - rowText.length);

        return (
          <Text key={job.id}>
            <Text dimColor>{' '}</Text>
            <Text dimColor>{' - '}</Text>
            <Text>{fit(job.name, nameW)}</Text>
            <Text>{' '}</Text>
            <Text dimColor>{fit(job.schedule, schedW)}</Text>
            <Text dimColor>{fit(job.nextRun, nextW)}</Text>
            <Text dimColor>{fit('—', lastW)}</Text>
            <Text dimColor>{' '.repeat(rowPad)}</Text>
          </Text>
        );
      })}
    </Box>
  );
}

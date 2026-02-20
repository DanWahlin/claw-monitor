import { useState, useEffect, useCallback, useRef } from 'react';
import { execSync } from 'child_process';
import { cronToHuman, relativeTime, nextCronRun } from '../utils/cronUtils.js';

export interface SystemCronJob {
  id: string;
  name: string;
  schedule: string;
  nextRun: string;
  nextRunMs: number;
}

export interface SystemCronStats {
  total: number;
}

function extractName(command: string): string {
  const cleaned = command
    .replace(/^(sudo\s+|nice\s+(-n\s+\d+\s+)?|ionice\s+\S+\s+)/, '')
    .replace(/\s+[>|].*$/, '')
    .replace(/\s+2>&1.*$/, '')
    .trim();

  const cmd = cleaned.split(/\s+/)[0] || cleaned;
  return (cmd.split('/').pop() || cmd).substring(0, 22);
}

// Returns { jobs, succeeded } so the caller can distinguish a command
// failure (preserve previous data) from a genuinely empty crontab.
function loadSystemCron(): { jobs: SystemCronJob[]; succeeded: boolean } {
  let output: string;
  try {
    output = execSync('crontab -l 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return { jobs: [], succeeded: false };
  }

  const jobs: SystemCronJob[] = [];

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || /^\w+=/.test(trimmed)) continue;

    if (trimmed.startsWith('@')) {
      const match = trimmed.match(/^@(\w+)\s+(.+)$/);
      if (match) {
        const schedMap: Record<string, string> = {
          reboot: 'on reboot', hourly: 'every 1h', daily: 'daily 00:00',
          weekly: 'weekly Sun', monthly: 'monthly 1st',
          annually: 'yearly Jan 1', yearly: 'yearly Jan 1',
        };
        jobs.push({
          id: `sys-${jobs.length}`,
          name: extractName(match[2]),
          schedule: schedMap[match[1]] || `@${match[1]}`,
          nextRun: '—',
          nextRunMs: 0,
        });
      }
      continue;
    }

    const match = trimmed.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;

    const [, m, h, dom, mon, dow, command] = match;
    const nextMs = nextCronRun(m, h, dom, mon, dow);

    jobs.push({
      id: `sys-${jobs.length}`,
      name: extractName(command),
      schedule: cronToHuman(m, h, dom, mon, dow),
      nextRun: nextMs ? relativeTime(nextMs) : '—',
      nextRunMs: nextMs || 0,
    });
  }

  jobs.sort((a, b) => {
    if (a.nextRunMs === 0 && b.nextRunMs === 0) return 0;
    if (a.nextRunMs === 0) return 1;
    if (b.nextRunMs === 0) return -1;
    return a.nextRunMs - b.nextRunMs;
  });

  return { jobs, succeeded: true };
}

export function useSystemCron() {
  // Lazy init avoids an empty-state flash on first render
  const [jobs, setJobs] = useState<SystemCronJob[]>(() => loadSystemCron().jobs);

  const refresh = useCallback(() => {
    const result = loadSystemCron();
    // Keep previous data only when the command itself failed
    if (!result.succeeded) return;
    setJobs(result.jobs);
  }, []);

  useEffect(() => {
    // Crontab rarely changes — poll infrequently to minimise re-renders
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const stats: SystemCronStats = { total: jobs.length };
  return { jobs, stats };
}

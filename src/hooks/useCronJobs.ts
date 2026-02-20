import { useState, useEffect, useCallback } from 'react';
import { execSync } from 'child_process';
import { cronToHuman, relativeTime, formatDuration } from '../utils/cronUtils.js';
import { POLL_CRON } from '../utils/config.js';

export interface CronJob {
  id: string;
  name: string;
  model: string;
  enabled: boolean;
  schedule: string;      // human-readable
  nextRun: string;       // relative time
  nextRunMs: number;     // raw ms for sorting
  lastStatus: 'ok' | 'error' | 'none';
  lastDuration: string;
  consecutiveErrors: number;
  isRunning: boolean;
}

export interface CronStats {
  total: number;
  healthy: number;
  erroring: number;
  running: number;
}

function humanSchedule(sched: any): string {
  if (!sched) return '?';

  if (sched.kind === 'every') {
    const ms = sched.everyMs;
    if (ms >= 3600000) return `every ${Math.round(ms / 3600000)}h`;
    if (ms >= 60000) return `every ${Math.round(ms / 60000)}m`;
    return `every ${Math.round(ms / 1000)}s`;
  }

  if (sched.kind === 'cron' && sched.expr) {
    return cronToHuman(sched.expr, sched.tz);
  }

  if (sched.kind === 'at') {
    const d = new Date(sched.at);
    return d.toISOString().replace('T', ' ').substring(0, 16);
  }

  return '?';
}


function loadCronJobs(): { jobs: CronJob[]; warning: string | null } {
  let output: string;
  try {
    output = execSync('openclaw cron list --json 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return { jobs: [], warning: 'openclaw cron list failed' };
  }

  try {
    const data = JSON.parse(output);
    const jobs: any[] = data.jobs || [];

    return {
      warning: null,
      jobs: jobs
        .filter(j => j.enabled !== false)
        .map(j => {
          const state = j.state || {};
          const rawModel = j.payload?.model || j.model || '—';
          return {
            id: j.id,
            name: j.name || j.id.substring(0, 8),
            model: rawModel.includes('/') ? (rawModel.split('/').pop() || rawModel) : rawModel,
            enabled: j.enabled !== false,
            schedule: humanSchedule(j.schedule),
            nextRun: state.nextRunAtMs ? relativeTime(state.nextRunAtMs) : '—',
            nextRunMs: state.nextRunAtMs || 0,
            lastStatus: state.lastStatus || 'none',
            lastDuration: state.lastDurationMs ? formatDuration(state.lastDurationMs) : '—',
            consecutiveErrors: state.consecutiveErrors || 0,
            isRunning: !!state.runningAtMs,
          };
        })
        .sort((a, b) => a.nextRunMs - b.nextRunMs),
    };
  } catch {
    return { jobs: [], warning: 'Failed to parse cron job data' };
  }
}

export function useCronJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [warning, setWarning] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const result = loadCronJobs();
    setJobs(result.jobs);
    setWarning(result.warning);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_CRON);
    return () => clearInterval(interval);
  }, [refresh]);

  const stats: CronStats = {
    total: jobs.length,
    healthy: jobs.filter(j => j.lastStatus === 'ok').length,
    erroring: jobs.filter(j => j.consecutiveErrors > 0).length,
    running: jobs.filter(j => j.isRunning).length,
  };

  return { jobs, stats, warning };
}

import { useState, useEffect, useCallback } from 'react';
import { execSync } from 'child_process';

export interface CronJob {
  id: string;
  name: string;
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

function cronToHuman(expr: string, tz?: string): string {
  const parts = expr.split(/\s+/);
  if (parts.length < 5) return expr;

  const [min, hour, dom, mon, dow] = parts;
  const tzLabel = tz && tz !== 'UTC' ? ` ${tz.split('/').pop()?.substring(0, 3)}` : '';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let dayPart = '';
  if (dow !== '*') {
    const days = dow.split(',').map(d => dayNames[parseInt(d)] || d).join(',');
    dayPart = `${days} `;
  }

  const timePart = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  return `${dayPart}${timePart}${tzLabel}`;
}

function relativeTime(ms: number): string {
  const now = Date.now();
  const diff = ms - now;

  if (diff < 0) return 'overdue';
  if (diff < 60000) return `in ${Math.round(diff / 1000)}s`;
  if (diff < 3600000) return `in ${Math.round(diff / 60000)}m`;
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    const mins = Math.round((diff % 3600000) / 60000);
    return mins > 0 ? `in ${hours}h${mins}m` : `in ${hours}h`;
  }
  const days = Math.round(diff / 86400000);
  return `in ${days}d`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return secs > 0 ? `${mins}m${secs}s` : `${mins}m`;
}

function loadCronJobs(): CronJob[] {
  let output: string;
  try {
    output = execSync('openclaw cron list --json 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return [];
  }

  try {
    const data = JSON.parse(output);
    const jobs: any[] = data.jobs || [];

    return jobs
      .filter(j => j.enabled !== false)
      .map(j => {
        const state = j.state || {};
        return {
          id: j.id,
          name: j.name || j.id.substring(0, 8),
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
      .sort((a, b) => a.nextRunMs - b.nextRunMs);
  } catch {
    return [];
  }
}

export function useCronJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([]);

  const refresh = useCallback(() => {
    setJobs(loadCronJobs());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const stats: CronStats = {
    total: jobs.length,
    healthy: jobs.filter(j => j.lastStatus === 'ok').length,
    erroring: jobs.filter(j => j.consecutiveErrors > 0).length,
    running: jobs.filter(j => j.isRunning).length,
  };

  return { jobs, stats };
}

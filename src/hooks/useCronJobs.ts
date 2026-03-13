import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { cronToHuman, relativeTime, formatDuration } from '../utils/cronUtils.js';

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

function parseJobs(raw: string): { jobs: CronJob[]; warning: string | null } {
  const data = JSON.parse(raw);
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
}

// ── Path resolution ────────────────────────────────────────────────────
// Resolve cron store path: config cron.store > $OPENCLAW_HOME/cron/jobs.json > ~/.openclaw/cron/jobs.json
function resolveCronStorePath(): string | null {
  const openclawHome = process.env.OPENCLAW_HOME || path.join(os.homedir(), '.openclaw');
  const configPath = path.join(openclawHome, 'openclaw.json');

  // Check config for custom cron.store
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config?.cron?.store && typeof config.cron.store === 'string') {
      const storePath = config.cron.store.replace(/^~\//, os.homedir() + '/');
      if (fs.existsSync(storePath)) return storePath;
    }
  } catch {
    // Config unreadable or unparseable — fall through to default
  }

  // Default path
  const defaultPath = path.join(openclawHome, 'cron', 'jobs.json');
  if (fs.existsSync(defaultPath)) return defaultPath;

  return null;
}

// ── Async CLI fallback ─────────────────────────────────────────────────
// Used when the file path can't be resolved (custom store, Docker, etc.)
let cliFallbackResult: { jobs: CronJob[]; warning: string | null } = { jobs: [], warning: null };
let cliFetching = false;

function refreshViaCli(): void {
  if (cliFetching) return;
  cliFetching = true;

  execFile('openclaw', ['cron', 'list', '--json'], { timeout: 15000 }, (err, stdout) => {
    cliFetching = false;
    if (err || !stdout.trimStart().startsWith('{')) {
      if (cliFallbackResult.jobs.length === 0) {
        cliFallbackResult = { jobs: [], warning: 'openclaw cron list failed' };
      }
      return;
    }
    try {
      cliFallbackResult = parseJobs(stdout);
    } catch {
      if (cliFallbackResult.jobs.length === 0) {
        cliFallbackResult = { jobs: [], warning: 'Failed to parse cron job data' };
      }
    }
  });
}

// ── Cached path resolution ─────────────────────────────────────────────
let resolvedPath: string | null | undefined; // undefined = not yet resolved
let useCliFallback = false;

export function loadCronJobs(): { jobs: CronJob[]; warning: string | null } {
  // Resolve path once
  if (resolvedPath === undefined) {
    resolvedPath = resolveCronStorePath();
    if (!resolvedPath) {
      useCliFallback = true;
      refreshViaCli(); // kick off first async fetch
    }
  }

  // Fast path: direct file read
  if (resolvedPath) {
    try {
      const raw = fs.readFileSync(resolvedPath, 'utf-8');
      return parseJobs(raw);
    } catch {
      // File disappeared or became unreadable — try re-resolving next call
      resolvedPath = undefined;
      return { jobs: [], warning: `Cannot read ${resolvedPath}` };
    }
  }

  // Slow path: async CLI fallback (non-blocking, returns cached data)
  if (useCliFallback) {
    refreshViaCli();
    return cliFallbackResult;
  }

  return { jobs: [], warning: 'Cron store not found' };
}

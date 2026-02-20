// Centralised configuration with environment-variable overrides.
// Every tunable constant lives here so nothing is scattered across hooks/components.

import * as path from 'path';
import * as os from 'os';

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}

function envStr(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

// ── Paths ──────────────────────────────────────────────────────────────────
export const SESSIONS_DIR = envStr(
  'OPENCLAW_DIR',
  path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions'),
);
export const SESSIONS_JSON = path.join(SESSIONS_DIR, 'sessions.json');

// ── Poll intervals (ms) ───────────────────────────────────────────────────
export const POLL_AGENTS   = envInt('POLL_AGENTS',   500);
export const POLL_CODING   = envInt('POLL_CODING',   5000);
export const POLL_STATS    = envInt('POLL_STATS',    10000);
export const POLL_CRON     = envInt('POLL_CRON',     15000);
export const POLL_SYSCRON  = envInt('POLL_SYSCRON',  60000);

// ── Display limits ─────────────────────────────────────────────────────────
export const MAX_SESSIONS  = envInt('MAX_SESSIONS',  10);

// ── SysStats thresholds & sizing ───────────────────────────────────────────
export const WARN_THRESHOLD = envInt('WARN_THRESHOLD', 70);   // yellow
export const CRIT_THRESHOLD = envInt('CRIT_THRESHOLD', 90);   // red
export const BAR_WIDTH      = envInt('BAR_WIDTH',      20);

// ── Layout ─────────────────────────────────────────────────────────────────
export const MIN_BOX_WIDTH = 60;
export const MAX_BOX_WIDTH = 120;

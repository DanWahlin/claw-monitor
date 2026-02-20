// Shared formatting helpers used by both OpenClaw and system cron sections.

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Truncate or pad a string to an exact display width. */
export function fit(text: string, width: number): string {
  if (text.length > width) return text.substring(0, width - 1) + '~';
  return text.padEnd(width);
}

/** Turn a millisecond timestamp into a short relative label ("in 5m"). */
export function relativeTime(ms: number): string {
  const diff = ms - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 60000) return `in ${Math.round(diff / 1000)}s`;
  if (diff < 3600000) return `in ${Math.round(diff / 60000)}m`;
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    const mins = Math.round((diff % 3600000) / 60000);
    return mins > 0 ? `in ${hours}h${mins}m` : `in ${hours}h`;
  }
  return `in ${Math.round(diff / 86400000)}d`;
}

/** Format a duration in ms as a compact string ("2m30s"). */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return secs > 0 ? `${mins}m${secs}s` : `${mins}m`;
}

/**
 * Convert a five-field cron expression to a short human-readable string.
 *
 * Accepts either a single expression string ("0 2 * * 1-5") or the five
 * individual fields.  An optional timezone label can be appended.
 */
export function cronToHuman(exprOrMin: string, hourOrTz?: string, dom?: string, mon?: string, dow?: string): string {
  let min: string, hour: string, tz: string | undefined;

  if (dom === undefined) {
    // Called with (expr, tz?)
    const parts = exprOrMin.split(/\s+/);
    if (parts.length < 5) return exprOrMin;
    [min, hour, dom, mon, dow] = parts as [string, string, string, string, string];
    tz = hourOrTz;
  } else {
    // Called with (min, hour, dom, mon, dow)
    min = exprOrMin;
    hour = hourOrTz!;
  }

  const tzLabel = tz && tz !== 'UTC' ? ` ${tz.split('/').pop()?.substring(0, 3)}` : '';

  let dayPart = '';
  if (dow !== '*') {
    const days = dow!.split(',').map(d => DAY_NAMES[parseInt(d)] || d).join(',');
    dayPart = `${days} `;
  }

  if (hour !== '*' && min !== '*' && !min.startsWith('*/') && !hour.startsWith('*/')) {
    return `${dayPart}${hour.padStart(2, '0')}:${min.padStart(2, '0')}${tzLabel}`;
  }

  if (min.startsWith('*/')) return `every ${min.substring(2)}m`;
  if (hour.startsWith('*/') && min === '0') return `every ${hour.substring(2)}h`;
  if (hour === '*' && !min.startsWith('*/')) return `hourly :${min.padStart(2, '0')}`;

  return `${min} ${hour} ${dom} ${mon} ${dow}`.substring(0, 22);
}

/**
 * Compute the next matching minute for a five-field cron expression.
 * Returns epoch-ms or null if nothing matches within 7 days.
 *
 * Per the cron spec, when both day-of-month and day-of-week are restricted
 * (neither is '*'), the day matches if EITHER field matches (OR logic).
 */
export function nextCronRun(min: string, hour: string, dom: string, mon: string, dow: string): number | null {
  const matchesField = (expr: string, value: number): boolean => {
    if (expr === '*') return true;
    if (expr.startsWith('*/')) {
      const step = parseInt(expr.substring(2));
      return !isNaN(step) && step > 0 && value % step === 0;
    }
    if (expr.includes('-') && !expr.includes(',')) {
      const [s, e] = expr.split('-').map(Number);
      return value >= s && value <= e;
    }
    return expr.split(',').map(v => parseInt(v)).includes(value);
  };

  const bothDaysRestricted = dom !== '*' && dow !== '*';

  const check = new Date();
  check.setSeconds(0, 0);
  check.setMinutes(check.getMinutes() + 1);

  for (let i = 0; i < 10080; i++) {
    const dayOk = bothDaysRestricted
      ? matchesField(dom, check.getDate()) || matchesField(dow, check.getDay())
      : matchesField(dom, check.getDate()) && matchesField(dow, check.getDay());

    if (
      matchesField(min, check.getMinutes()) &&
      matchesField(hour, check.getHours()) &&
      dayOk &&
      matchesField(mon, check.getMonth() + 1)
    ) {
      return check.getTime();
    }
    check.setMinutes(check.getMinutes() + 1);
  }
  return null;
}

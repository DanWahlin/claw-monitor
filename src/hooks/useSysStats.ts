import { useState, useEffect, useCallback } from 'react';
import { execSync } from 'child_process';
import * as os from 'os';

export interface SysStats {
  cpu: { percent: number; cores: number };
  mem: { usedGB: number; totalGB: number; percent: number };
  disk: { usedGB: number; totalGB: number; percent: number; mount: string };
}

function getCpuPercent(): number {
  try {
    // Use /proc/stat for accurate CPU usage over a brief sample
    const output = execSync(
      "top -bn1 | grep '%Cpu' | awk '{print 100 - $8}'",
      { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const val = parseFloat(output.trim());
    return isNaN(val) ? 0 : Math.round(val);
  } catch {
    return 0;
  }
}

function getMemStats(): { usedGB: number; totalGB: number; percent: number } {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = totalBytes - freeBytes;
  const totalGB = totalBytes / (1024 ** 3);
  const usedGB = usedBytes / (1024 ** 3);
  const percent = Math.round((usedBytes / totalBytes) * 100);
  return { usedGB: Math.round(usedGB * 10) / 10, totalGB: Math.round(totalGB * 10) / 10, percent };
}

function getDiskStats(): { usedGB: number; totalGB: number; percent: number; mount: string } {
  try {
    const output = execSync("df -BG / | tail -1", {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const parts = output.trim().split(/\s+/);
    // Format: Filesystem 1G-blocks Used Available Use% Mounted
    const totalGB = parseInt(parts[1]) || 0;
    const usedGB = parseInt(parts[2]) || 0;
    const percent = parseInt(parts[4]) || 0;
    const mount = parts[5] || '/';
    return { usedGB, totalGB, percent, mount };
  } catch {
    return { usedGB: 0, totalGB: 0, percent: 0, mount: '/' };
  }
}

function collectStats(): SysStats {
  return {
    cpu: { percent: getCpuPercent(), cores: os.cpus().length },
    mem: getMemStats(),
    disk: getDiskStats(),
  };
}

export function useSysStats() {
  const [stats, setStats] = useState<SysStats>(collectStats);

  const refresh = useCallback(() => {
    setStats(collectStats());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000); // every 10s
    return () => clearInterval(interval);
  }, [refresh]);

  return stats;
}

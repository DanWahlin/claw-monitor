import { useState, useEffect, useCallback } from 'react';
import { execSync } from 'child_process';
import * as os from 'os';
import { POLL_STATS } from '../utils/config.js';

export interface GpuInfo {
  percent: number;
  memUsedMB: number;
  memTotalMB: number;
  memPercent: number;
  name: string;
}

export interface DockerInfo {
  running: number;
  available: boolean;
}

export interface SysStats {
  cpu: { percent: number; cores: number };
  mem: { usedGB: number; totalGB: number; percent: number };
  disk: { usedGB: number; totalGB: number; percent: number; mount: string };
  gpu: GpuInfo | null;
  docker: DockerInfo;
  warnings: string[];
}

// Detect tool availability once at startup
let hasNvidiaSmi: boolean | null = null;
let hasDocker: boolean | null = null;

function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'pipe', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

function getCpuPercent(warnings: string[]): number {
  try {
    const output = execSync(
      "top -bn1 | grep '%Cpu' | awk '{print 100 - $8}'",
      { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const val = parseFloat(output.trim());
    return isNaN(val) ? 0 : Math.round(val);
  } catch {
    warnings.push('CPU stats unavailable');
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

function getDiskStats(warnings: string[]): { usedGB: number; totalGB: number; percent: number; mount: string } {
  try {
    const output = execSync("df -BG / | tail -1", {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const parts = output.trim().split(/\s+/);
    const totalGB = parseInt(parts[1]) || 0;
    const usedGB = parseInt(parts[2]) || 0;
    const percent = parseInt(parts[4]) || 0;
    const mount = parts[5] || '/';
    return { usedGB, totalGB, percent, mount };
  } catch {
    warnings.push('Disk stats unavailable');
    return { usedGB: 0, totalGB: 0, percent: 0, mount: '/' };
  }
}

function getGpuStats(warnings: string[]): GpuInfo | null {
  if (hasNvidiaSmi === null) hasNvidiaSmi = commandExists('nvidia-smi');
  if (!hasNvidiaSmi) return null;

  try {
    const output = execSync(
      'nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,name --format=csv,noheader,nounits 2>/dev/null',
      { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const parts = output.trim().split(',').map(s => s.trim());
    if (parts.length < 4) return null;
    return {
      percent: parseInt(parts[0]) || 0,
      memUsedMB: parseInt(parts[1]) || 0,
      memTotalMB: parseInt(parts[2]) || 0,
      memPercent: parts[2] ? Math.round((parseInt(parts[1]) / parseInt(parts[2])) * 100) : 0,
      name: parts[3] || 'GPU',
    };
  } catch {
    warnings.push('GPU stats unavailable');
    return null;
  }
}

function getDockerStats(warnings: string[]): DockerInfo {
  if (hasDocker === null) hasDocker = commandExists('docker');
  if (!hasDocker) return { running: 0, available: false };

  try {
    const output = execSync('docker ps -q 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const ids = output.trim().split('\n').filter(l => l.length > 0);
    return { running: ids.length, available: true };
  } catch {
    warnings.push('Docker stats unavailable');
    return { running: 0, available: true };
  }
}

function collectStats(): SysStats {
  const warnings: string[] = [];
  return {
    cpu: { percent: getCpuPercent(warnings), cores: os.cpus().length },
    mem: getMemStats(),
    disk: getDiskStats(warnings),
    gpu: getGpuStats(warnings),
    docker: getDockerStats(warnings),
    warnings,
  };
}

export function useSysStats() {
  const [stats, setStats] = useState<SysStats>(collectStats);

  const refresh = useCallback(() => {
    setStats(collectStats());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_STATS);
    return () => clearInterval(interval);
  }, [refresh]);

  return stats;
}

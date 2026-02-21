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

export interface DockerContainer {
  name: string;
  image: string;
  status: string;
  source: 'docker' | 'k8s';
}

export interface DockerInfo {
  running: number;
  containers: DockerContainer[];
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
let hasKubectl: boolean | null = null;
const isMac = process.platform === 'darwin';

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
    let output: string;
    if (isMac) {
      // macOS: top -l1 outputs "CPU usage: X% user, Y% sys, Z% idle"
      output = execSync(
        "top -l1 -n0 | grep 'CPU usage' | awk '{print 100 - $7}'",
        { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } else {
      output = execSync(
        "top -bn1 | grep '%Cpu' | awk '{print 100 - $8}'",
        { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
    }
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
    // macOS df uses -g for GB blocks; Linux uses -BG
    const cmd = isMac ? 'df -g / | tail -1' : 'df -BG / | tail -1';
    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const parts = output.trim().split(/\s+/);
    const totalGB = parseInt(parts[1]) || 0;
    const usedGB = parseInt(parts[2]) || 0;
    const percent = parseInt(parts[4]) || 0;
    const mount = parts[isMac ? 8 : 5] || '/';
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
  if (!hasDocker) return { running: 0, containers: [], available: false };

  try {
    const output = execSync(
      'docker ps --format "{{.Names}}\\t{{.Image}}\\t{{.Status}}" 2>/dev/null',
      { encoding: 'utf-8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const containers: DockerContainer[] = output.trim().split('\n')
      .filter(l => l.length > 0)
      .map(line => {
        const [name, image, ...statusParts] = line.split('\t');
        return { name: name || '?', image: image || '?', status: statusParts.join(' ') || '?', source: 'docker' as const };
      });
    return { running: containers.length, containers, available: true };
  } catch {
    warnings.push('Docker stats unavailable');
    return { running: 0, containers: [], available: true };
  }
}

import * as fs from 'fs';

// System namespaces to exclude from k8s pod listing
const K8S_SYSTEM_NS = new Set([
  'kube-system', 'kube-public', 'kube-node-lease',
  'cattle-system', 'fleet-system', 'cattle-fleet-system',
]);

const K3S_KUBECONFIG = '/etc/rancher/k3s/k3s.yaml';

// Detect k3s vs generic k8s at startup
let k8sLabel: 'k3s' | 'k8s' = 'k8s';
let k8sKubectlPrefix: string = 'kubectl';

function initK8sConfig(): void {
  if (hasKubectl === null) hasKubectl = commandExists('kubectl');
  if (!hasKubectl) return;

  // If k3s kubeconfig exists, use it with the default context
  try {
    if (fs.existsSync(K3S_KUBECONFIG)) {
      k8sLabel = 'k3s';
      k8sKubectlPrefix = `kubectl --kubeconfig ${K3S_KUBECONFIG} --context default`;
    }
  } catch {
    // fall through to default kubectl
  }
}

function getK8sPods(warnings: string[]): DockerContainer[] {
  if (hasKubectl === null) {
    initK8sConfig();
  }
  if (!hasKubectl) return [];

  try {
    const output = execSync(
      `${k8sKubectlPrefix} get pods --all-namespaces --no-headers 2>/dev/null`,
      { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return output.trim().split('\n')
      .filter(l => l.length > 0)
      .map(line => {
        // Default kubectl output: NAMESPACE NAME READY STATUS RESTARTS AGE
        const parts = line.trim().split(/\s+/);
        const ns = parts[0] || '';
        const name = parts[1] || '?';
        const ready = parts[2] || '0/0';
        const phase = parts[3] || '?';
        return { ns, name, ready, phase };
      })
      .filter(p => !K8S_SYSTEM_NS.has(p.ns))
      .map(p => {
        const [readyCount, totalCount] = p.ready.split('/').map(Number);
        const isRunning = p.phase === 'Running';
        const allReady = isRunning && !isNaN(readyCount) && !isNaN(totalCount) && totalCount > 0 && readyCount === totalCount;
        const health = isRunning ? (allReady ? '(healthy)' : '(unhealthy)') : '';
        const status = health ? `${p.phase} ${health}` : p.phase;
        return {
          name: `${p.name} (${k8sLabel})`,
          image: '',
          status,
          source: 'k8s' as const,
        };
      });
  } catch {
    // kubectl not connected or cluster unreachable — silently skip
    return [];
  }
}

function collectStats(): SysStats {
  const warnings: string[] = [];
  const docker = getDockerStats(warnings);
  const k8sPods = getK8sPods(warnings);
  if (k8sPods.length > 0) {
    docker.containers = [...docker.containers, ...k8sPods];
    docker.running = docker.containers.length;
    docker.available = true;
  }
  return {
    cpu: { percent: getCpuPercent(warnings), cores: os.cpus().length },
    mem: getMemStats(),
    disk: getDiskStats(warnings),
    gpu: getGpuStats(warnings),
    docker,
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

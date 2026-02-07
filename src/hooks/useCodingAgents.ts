import { useState, useEffect, useCallback } from 'react';
import { execSync } from 'child_process';

export type AgentType = 'CC' | 'GHCP' | 'Codex';

export interface CodingAgent {
  type: AgentType;
  pid: number;
  elapsed: string;
  command: string;
}

export interface CodingAgentStats {
  total: number;
  cc: number;
  ghcp: number;
  codex: number;
}

interface PatternMatch {
  type: AgentType;
  pattern: RegExp;
}

const PATTERNS: PatternMatch[] = [
  { type: 'CC', pattern: /(?:^|\/)claude\s+--dangerously/ },
  { type: 'GHCP', pattern: /(?:^|\/)gh\s+copilot/ },
  { type: 'Codex', pattern: /(?:^|\/)codex\s+exec/ },
];

// Patterns to exclude (wrapper processes, shells, sudo, grep, etc.)
const EXCLUDE_PATTERNS = [
  /^sudo\s/,
  /\bsh\s+-c\b/,
  /\bbash\s+-c\b/,
  /\bgrep\b/,
  /\bps\s+aux\b/,
  /\btee\b/,
];

function parsePsLine(line: string): { pid: number; elapsed: string; command: string } | null {
  // ps aux format: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND...
  const parts = line.trim().split(/\s+/);
  if (parts.length < 11) return null;

  const pid = parseInt(parts[1], 10);
  if (isNaN(pid)) return null;

  const elapsed = parts[9]; // TIME column (cumulative CPU time)
  const command = parts.slice(10).join(' ');

  return { pid, elapsed, command };
}

function detectAgents(): CodingAgent[] {
  let output: string;
  try {
    output = execSync('ps aux --no-headers', {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return [];
  }

  const agents: CodingAgent[] = [];
  const lines = output.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const parsed = parsePsLine(line);
    if (!parsed) continue;

    // Skip wrapper/shell processes
    if (EXCLUDE_PATTERNS.some(ep => ep.test(parsed.command))) continue;

    for (const { type, pattern } of PATTERNS) {
      if (pattern.test(parsed.command)) {
        // Truncate command for display
        const maxLen = 45;
        const cmd = parsed.command.length > maxLen
          ? parsed.command.substring(0, maxLen - 3) + '...'
          : parsed.command;

        agents.push({
          type,
          pid: parsed.pid,
          elapsed: parsed.elapsed,
          command: cmd,
        });
        break;
      }
    }
  }

  return agents;
}

export function useCodingAgents() {
  const [agents, setAgents] = useState<CodingAgent[]>([]);

  const refresh = useCallback(() => {
    setAgents(detectAgents());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  const stats: CodingAgentStats = {
    total: agents.length,
    cc: agents.filter(a => a.type === 'CC').length,
    ghcp: agents.filter(a => a.type === 'GHCP').length,
    codex: agents.filter(a => a.type === 'Codex').length,
  };

  return { agents, stats };
}

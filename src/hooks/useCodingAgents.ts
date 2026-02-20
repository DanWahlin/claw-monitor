import { useState, useEffect, useCallback, useRef } from 'react';
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
  { type: 'Codex', pattern: /(?:^|\/)codex[\s/]/ },
];

// Patterns to exclude (wrapper processes, shells, sudo, grep, etc.)
const EXCLUDE_PATTERNS = [
  /^sudo\s/,
  /\bsh\s+-c\b/,
  /\bbash\s+-c\b/,
  /\bgrep\b/,
  /\bps\s+aux\b/,
  /\btee\b/,
  /^node\s/,
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
        // Redact sensitive flags and truncate for display
        const redacted = parsed.command.replace(
          /(--(token|api-key|api_key|secret|password|apikey|auth)[= ]\s*)(\S+)/gi,
          '$1***'
        );
        const maxLen = 45;
        const cmd = redacted.length > maxLen
          ? redacted.substring(0, maxLen - 3) + '...'
          : redacted;

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

  // Deduplicate: keep only lowest PID per agent type (parent process)
  const seen = new Map<AgentType, CodingAgent>();
  for (const agent of agents) {
    const existing = seen.get(agent.type);
    if (!existing || agent.pid < existing.pid) {
      seen.set(agent.type, agent);
    }
  }
  return Array.from(seen.values());
}

export function useCodingAgents() {
  const [agents, setAgents] = useState<CodingAgent[]>([]);
  const prevKeyRef = useRef('');

  const refresh = useCallback(() => {
    const next = detectAgents();
    // Only update state when the agent list actually changed (avoids re-render flicker)
    const key = next.map(a => `${a.type}:${a.pid}`).join(',');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;
    setAgents(next);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
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

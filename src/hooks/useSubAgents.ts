import { useState, useEffect, useCallback, useRef } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import { parseSession, SessionData } from '../utils/parseSession.js';
import { SESSIONS_DIR, SESSIONS_JSON, MAX_SESSIONS, POLL_AGENTS } from '../utils/config.js';


interface SessionMeta {
  sessionId: string;
  label?: string;
  updatedAt?: number;
  abortedLastRun?: boolean;
}

interface SessionsData {
  labels: Map<string, string>;
  activeSessionIds: Set<string>;
  subagentSessionIds: Set<string>;
}

// Load metadata from OpenClaw's sessions.json
function loadSessionsData(): SessionsData {
  const labels = new Map<string, string>();
  const activeSessionIds = new Set<string>();
  const subagentSessionIds = new Set<string>();
  
  try {
    if (fs.existsSync(SESSIONS_JSON)) {
      const stats = fs.statSync(SESSIONS_JSON);
      const data = JSON.parse(fs.readFileSync(SESSIONS_JSON, 'utf-8'));
      const now = Date.now();
      
      for (const [key, value] of Object.entries(data)) {
        const meta = value as SessionMeta;
        if (!meta.sessionId) continue;
        
        // Track if this is a subagent
        if (key.includes('subagent')) {
          subagentSessionIds.add(meta.sessionId);
          
          // Store label if present
          if (meta.label) {
            labels.set(meta.sessionId, meta.label);
          }
          
          // Check if recently active (within last 60 seconds)
          if (meta.updatedAt && (now - meta.updatedAt) < 60000) {
            activeSessionIds.add(meta.sessionId);
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }
  
  return { labels, activeSessionIds, subagentSessionIds };
}

export function useSubAgents(showAll: boolean = false) {
  const [agents, setAgents] = useState<SessionData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const prevKeyRef = useRef('');

  const loadSessions = useCallback(() => {
    try {
      if (!fs.existsSync(SESSIONS_DIR)) {
        setError(`Sessions directory not found: ${SESSIONS_DIR}`);
        return;
      }

      // Load metadata from sessions.json
      const { labels, activeSessionIds, subagentSessionIds } = loadSessionsData();

      const files = fs.readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith('.jsonl') && !f.includes('.lock') && !f.includes('.deleted'))
        .map(f => path.join(SESSIONS_DIR, f));

      let sessions = files
        .map(f => {
          const session = parseSession(f);
          if (!session) return null;
          
          // Extract session ID from filename
          const sessionId = path.basename(f, '.jsonl');
          
          // Only include subagent sessions
          if (!subagentSessionIds.has(sessionId)) {
            return null;
          }
          
          // Use OpenClaw label if available
          const label = labels.get(sessionId);
          if (label) {
            session.label = label;
          }
          
          // Use OpenClaw's active status instead of file mtime heuristic
          if (activeSessionIds.has(sessionId)) {
            session.status = 'running';
          } else if (session.status === 'running') {
            // File says running but OpenClaw says not active = complete
            session.status = 'complete';
          }
          
          return session;
        })
        .filter((s): s is SessionData => s !== null)
        .sort((a, b) => b.startTime - a.startTime);

      // Filter to running only unless showAll is true
      if (!showAll) {
        sessions = sessions.filter(s => s.status === 'running');
      } else {
        sessions = sessions.slice(0, MAX_SESSIONS);
      }

      // Only update state when agent list actually changed (avoids re-render flicker)
      const key = sessions.map(s => `${s.filePath}:${s.status}`).join(',');
      if (key !== prevKeyRef.current) {
        prevKeyRef.current = key;
        setAgents(sessions);
      }
      setError(null);
    } catch (err) {
      setError(`Error loading sessions: ${err}`);
    }
  }, [showAll]);

  useEffect(() => {
    // Initial load
    loadSessions();

    // Set up file watcher
    let watcher: chokidar.FSWatcher | null = null;

    try {
      if (fs.existsSync(SESSIONS_DIR)) {
        watcher = chokidar.watch(SESSIONS_DIR, {
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50
          }
        });

        watcher.on('add', loadSessions);
        watcher.on('change', loadSessions);
        watcher.on('unlink', loadSessions);
      }
    } catch {
      // Watcher failed, fall back to polling
    }

    // Polling interval for status updates
    const interval = setInterval(loadSessions, POLL_AGENTS);

    return () => {
      clearInterval(interval);
      if (watcher) {
        watcher.close();
      }
    };
  }, [loadSessions]);

  const stats = {
    total: agents.length,
    running: agents.filter(a => a.status === 'running').length,
    complete: agents.filter(a => a.status === 'complete').length,
    failed: agents.filter(a => a.status === 'failed').length
  };

  return { agents, stats, error };
}

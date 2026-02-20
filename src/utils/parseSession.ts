import * as fs from 'fs';
import * as path from 'path';

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface SessionData {
  label: string;
  status: 'running' | 'complete' | 'failed';
  elapsed: number;
  currentTool: string | null;
  toolArgs: string | null;
  toolCount: number;
  recentTools: string[];
  errorDetails: string | null;
  filePath: string;
  startTime: number;
}

interface SessionLine {
  type: string;
  timestamp?: string;
  message?: {
    role: 'user' | 'assistant' | 'toolResult';
    content?: Array<{
      type?: string;
      text?: string;
      toolCall?: ToolCall;
    }> | string;
  };
  // For spawn tool results that include label
  details?: {
    label?: string;
  };
  // Top-level toolCall (separate line type)
  name?: string;
  arguments?: Record<string, unknown>;
}

function extractLabel(line: SessionLine): string | null {
  // Check for spawn details with label
  if (line.details?.label) {
    return line.details.label;
  }

  // Check user message content
  if (line.type === 'message' && line.message?.role === 'user') {
    const content = line.message.content;
    if (typeof content === 'string') {
      const firstLine = content.split('\n')[0].trim();
      return firstLine.length > 40 ? firstLine.substring(0, 37) + '...' : firstLine;
    }

    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'text' && item.text) {
          // Try to extract meaningful part (skip timestamps like "[Wed 2026-...")
          let text = item.text;
          const bracketMatch = text.match(/^\[.*?\]\s*/);
          if (bracketMatch) {
            text = text.substring(bracketMatch[0].length);
          }
          const firstLine = text.split('\n')[0].trim();
          return firstLine.length > 40 ? firstLine.substring(0, 37) + '...' : firstLine;
        }
      }
    }
  }

  return null;
}

function extractToolCall(line: SessionLine): ToolCall | null {
  // Top-level toolCall type
  if (line.type === 'toolCall' && line.name) {
    return {
      name: line.name,
      arguments: line.arguments || {}
    };
  }

  // Tool calls inside message content
  if (line.type === 'message' && line.message?.role === 'assistant') {
    const content = line.message.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'toolCall' && item.toolCall) {
          return item.toolCall;
        }
        // Direct toolCall structure in content
        if ((item as any).name && (item as any).type === 'toolCall') {
          return {
            name: (item as any).name,
            arguments: (item as any).arguments || {}
          };
        }
      }
    }
  }

  return null;
}

// Keys whose values should never be displayed
const SENSITIVE_KEYS = /token|key|secret|password|auth|credential/i;

function formatToolArgs(args: Record<string, unknown>): string {
  // Get first meaningful argument value
  for (const [key, value] of Object.entries(args)) {
    if (SENSITIVE_KEYS.test(key)) continue; // skip sensitive fields
    if (typeof value === 'string' && value.length > 0) {
      // Take first line only
      const firstLine = value.split('\n')[0];
      const truncated = firstLine.length > 40 ? firstLine.substring(0, 37) + '...' : firstLine;
      return `"${truncated}"`;
    }
  }
  return '';
}

export function parseSession(filePath: string): SessionData | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return null;
    }

    let label = path.basename(filePath, '.jsonl');
    let toolCount = 0;
    let lastTool: ToolCall | null = null;
    let startTime: number | null = null;
    let hasError = false;
    let errorDetails: string | null = null;
    const recentToolNames: string[] = [];

    for (const line of lines) {
      try {
        const parsed: SessionLine = JSON.parse(line);

        // Get session start time
        if (parsed.type === 'session' && parsed.timestamp) {
          startTime = new Date(parsed.timestamp).getTime();
        }

        // Try to extract label from first user message or spawn details
        if (label === path.basename(filePath, '.jsonl')) {
          const extractedLabel = extractLabel(parsed);
          if (extractedLabel) {
            label = extractedLabel;
          }
        }

        // Count and track tool calls
        const tool = extractToolCall(parsed);
        if (tool) {
          toolCount++;
          lastTool = tool;
          recentToolNames.push(tool.name);
        }

        // Check for errors in tool results
        if (parsed.message?.role === 'toolResult') {
          const content = parsed.message.content;
          if (Array.isArray(content)) {
            for (const item of content) {
              if (item.text && item.text.toLowerCase().includes('"error"')) {
                hasError = true;
                const snippet = item.text.substring(0, 80);
                errorDetails = snippet.length < item.text.length ? snippet + '...' : snippet;
              }
            }
          }
        }
      } catch {
        // Skip malformed lines
        continue;
      }
    }

    // Determine status based on file modification time
    const stats = fs.statSync(filePath);
    const mtime = stats.mtimeMs;
    const now = Date.now();
    const isRecent = (now - mtime) < 30000; // 30 seconds

    let status: 'running' | 'complete' | 'failed' = 'complete';
    if (isRecent) {
      status = 'running';
    } else if (hasError) {
      status = 'failed';
    }

    // Use file creation time if no timestamp found
    if (!startTime) {
      startTime = stats.birthtimeMs || stats.ctimeMs;
    }

    const elapsed = Math.floor((now - startTime) / 1000);

    return {
      label,
      status,
      elapsed,
      currentTool: lastTool?.name || null,
      toolArgs: lastTool ? formatToolArgs(lastTool.arguments) : null,
      toolCount,
      recentTools: recentToolNames.slice(-5),
      errorDetails,
      filePath,
      startTime
    };
  } catch (error) {
    return null;
  }
}

export function formatElapsed(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

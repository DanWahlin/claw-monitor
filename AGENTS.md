# AGENTS.md — Claw-Monitor Developer Guide

Context for AI coding agents working on this codebase.

## Project Overview

Terminal dashboard (TUI) for monitoring OpenClaw agents, cron jobs, Docker containers, and system resources. Built with Ink (React for CLIs) + TypeScript.

## Tech Stack

- **Runtime**: Node.js 18+ (ESM modules)
- **UI**: [Ink 4.4.1](https://github.com/vadimdemedes/ink) — React components rendered to the terminal
- **Language**: TypeScript (strict mode, ES2020 target, NodeNext modules)
- **Build**: `npm run build` → `tsc` → outputs to `dist/`
- **Entry point**: `src/index.tsx` → `dist/index.js`
- **Run**: `npm start` or `./bin/claw-monitor.js`

## Project Structure

```
src/
├── index.tsx                  # Entry point, flicker guard, Ink render
├── App.tsx                    # Main layout — all sections, keyboard input
├── components/
│   ├── AgentCard.tsx          # Sub-agent card (selectable, expandable)
│   ├── CodingAgentCard.tsx    # Coding agent display (Claude/Copilot/Codex)
│   ├── CronSection.tsx        # OpenClaw cron jobs table
│   ├── SystemCronSection.tsx  # System crontab table
│   ├── SysStats.tsx           # Two-column: resource bars + Docker containers
│   ├── Footer.tsx             # Summary stats bar
│   └── Spinner.tsx            # Loading spinner
├── hooks/
│   ├── useSubAgents.ts        # Polls OpenClaw session directory + JSONL logs
│   ├── useCodingAgents.ts     # Polls `ps aux` for coding agent processes
│   ├── useCronJobs.ts         # Polls `openclaw cron list --json`
│   ├── useSystemCron.ts       # Polls `crontab -l`
│   ├── useSysStats.ts         # Polls CPU/MEM/DISK/GPU/Docker
│   └── useTerminalSize.ts     # Terminal width with resize listener
└── utils/
    ├── config.ts              # All tunables with env-var overrides
    ├── cronUtils.ts           # Shared: fit(), relativeTime(), cronToHuman(), nextCronRun()
    └── parseSession.ts        # JSONL session log parser
bin/
├── claw-monitor.js            # CLI entry point (shebang wrapper)
├── cc-attach                  # tmux attach script for Claude Code
├── copilot-attach             # tmux attach script for Copilot CLI
└── codex-attach               # tmux attach script for Codex
```

## Architecture

### Rendering

Ink uses React to render terminal output. Components return `<Text>` and `<Box>` elements; Ink converts them to ANSI strings and writes to stdout.

**Flicker guard** (`src/index.tsx`): Ink's `clearTerminal` path fires on every React render when output exceeds terminal height, with no dedup guard. We intercept `stdout.write` and skip writes where the frame content is identical to the previous frame. This is the only modification to Ink's behavior — everything else is standard Ink/React.

### Data Flow

Each hook polls independently and returns data + optional warnings:

| Hook | Source | Default Interval |
|------|--------|-----------------|
| `useSubAgents` | File system (`~/.openclaw/agents/main/sessions/`) | 500ms |
| `useCodingAgents` | `ps aux` | 5s |
| `useCronJobs` | `openclaw cron list --json` | 15s |
| `useSystemCron` | `crontab -l` | 60s |
| `useSysStats` | `top`, `os.*`, `df`, `nvidia-smi`, `docker ps` | 10s |
| `useTerminalSize` | `stdout.columns` + resize event | Event-driven |

All intervals are configurable via environment variables (see `src/utils/config.ts`).

### Layout

`App.tsx` composes sections top-to-bottom inside a box-drawing border:

1. Coding Agents (if any detected)
2. Sub-Agents (with attach commands and detach hint)
3. OpenClaw Cron Jobs (if available)
4. System Cron Jobs (if available)
5. System Stats — two-column: resource bars (left) + Docker containers (right)
6. Footer — agent count summary
7. Help hint — keyboard shortcuts (contextual: ↑↓/Enter only shown when agents exist)

Width is responsive (60–120 columns) via `useTerminalSize`. All components receive `boxWidth` and handle their own padding/truncation.

## Key Conventions

- **Box-drawing borders**: All sections use manual `│`, `┌`, `└`, `├`, `┤`, `─` characters with padding to `boxWidth`. Components are responsible for their own left/right borders.
- **Emoji width**: Emoji like 🐳 are 2 visual columns but 1 JS char. Account for this in padding math.
- **`fit()` helper**: Truncates or pads strings to exact column width. Use it for table columns.
- **Warnings**: Hooks return a `warning` string when commands fail (e.g., `openclaw` not found). These render as yellow `⚠` lines inside the relevant section.
- **Anti-flicker guards**: `useSubAgents` and `useCodingAgents` use ref-based comparison to avoid setting state when data hasn't changed, reducing unnecessary React re-renders.
- **Config via env vars**: Every tunable (poll intervals, thresholds, paths) lives in `src/utils/config.ts` with an `envInt`/`envStr` helper.

## Build & Run

```bash
npm run build      # TypeScript compile
npm start          # Run the dashboard
npm run dev        # Watch mode (tsc --watch)
npm run clean      # Remove dist/
```

## Common Tasks

**Add a new dashboard section:**
1. Create a hook in `src/hooks/` that polls data and returns typed state
2. Create a component in `src/components/` that renders within box borders
3. Wire into `App.tsx` — call the hook, render the component in the layout

**Add a new system stat:**
1. Add detection + parsing in `useSysStats.ts` (use `commandExists()` for optional tools)
2. Add the data to the `SysStats` interface
3. Render in `SysStats.tsx`

**Change poll intervals:**
Set environment variables: `POLL_AGENTS=1000 POLL_STATS=5000 claw-monitor`

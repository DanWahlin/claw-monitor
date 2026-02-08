# 🦞 claw-monitor

A terminal UI for monitoring [OpenClaw](https://github.com/openclaw/openclaw) sub-agent sessions and coding agents (Claude Code, GitHub Copilot, Codex) in real-time.

![claw-monitor demo](https://img.shields.io/badge/status-beta-yellow)

## Features

- **Live monitoring** — Watch sub-agents work in real-time with 500ms refresh
- **Coding agent detection** — Shows running Claude Code, GitHub Copilot, and Codex processes
- **Status tracking** — See running, complete, and failed sessions at a glance
- **Session labels** — Shows spawn labels for easy identification
- **Tool activity** — Displays current tool being executed and total tool calls
- **Elapsed time** — Track how long each session has been running
- **Toggle modes** — Switch between "running only" and "all recent" views
- **Attach commands** — Jump into any coding agent's interactive session

<img width="709" height="292" alt="No sub agents" src="https://github.com/user-attachments/assets/8104b1fd-f536-4d54-a40f-b5c775735492" />

<img width="715" height="500" alt="Monitoring sub agents" src="https://github.com/user-attachments/assets/fe8f7815-7231-4090-83d0-a7b331be79b0" />


```bash
git clone https://github.com/DanWahlin/claw-monitor.git
cd claw-monitor
npm install
npm run build
```

## Usage

```bash
./bin/claw-monitor.js
```

Or add to your PATH for global access:

```bash
npm link
claw-monitor
```

### Controls

| Key | Action |
|-----|--------|
| `q` | Quit |
| `a` | Toggle between running-only and all sessions |
| `Ctrl+C` | Quit |

## Coding Agent Attach Commands

claw-monitor detects running coding agents (Claude Code, GitHub Copilot CLI, Codex) via process monitoring. To jump into an agent's interactive terminal session, use the attach commands included in `bin/`:

### Install

```bash
# Symlink to PATH (one-time setup)
sudo ln -sf "$(pwd)/bin/cc-attach" /usr/local/bin/cc-attach
sudo ln -sf "$(pwd)/bin/copilot-attach" /usr/local/bin/copilot-attach
sudo ln -sf "$(pwd)/bin/codex-attach" /usr/local/bin/codex-attach
```

### Usage

| Command | Attaches to | Model |
|---------|------------|-------|
| `cc-attach` | Claude Code | Opus 4.6 |
| `copilot-attach` | GitHub Copilot CLI | GPT-5 / Sonnet / Gemini |
| `codex-attach` | Codex | GPT-5.2 |

Detach from any session with `Ctrl+B` then `D` — the agent keeps running in the background.

> **Note:** These commands attach to tmux sessions named `cc`, `ghcp`, and `codex`. The sessions are created by your OpenClaw agent when it launches coding tasks. If no session is running, you'll see a message telling you to start one.

## Requirements

- Node.js 18+
- OpenClaw installed and running (reads from `~/.openclaw/agents/main/sessions/`)
- tmux (for coding agent attach/detach)

## How It Works

### Sub-Agent Monitoring
Watches OpenClaw's session directory (`~/.openclaw/agents/main/sessions/`) and `sessions.json` metadata file to:

1. Identify sub-agent sessions (filters out main session)
2. Parse JSONL session logs for tool usage and timing
3. Use OpenClaw's `updatedAt` timestamps for accurate activity detection
4. Display session labels assigned during `sessions_spawn`

### Coding Agent Detection
Polls `ps aux` every 2 seconds to detect running coding agent processes:

| Agent | Process pattern | Icon |
|-------|----------------|------|
| Claude Code | `claude --dangerously` | 🤖 |
| GitHub Copilot CLI | `gh copilot` | 🐙 |
| Codex | `codex` (Rust binary) | 📦 |

Filters out wrapper processes (sudo, bash, node shims) and deduplicates to show one entry per agent type. Agents run in named tmux sessions (`cc`, `ghcp`, `codex`) for easy attach/detach.

## Built With

- [ink](https://github.com/vadimdemedes/ink) — React for CLI apps
- [chokidar](https://github.com/paulmillr/chokidar) — File watching
- [tmux](https://github.com/tmux/tmux) — Terminal multiplexing for coding agent sessions

## License

MIT © Dan Wahlin

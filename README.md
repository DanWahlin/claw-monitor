# 🦞 claw-monitor

A terminal UI for monitoring [OpenClaw](https://github.com/openclaw/openclaw) sub-agent sessions in real-time.

![claw-monitor demo](https://img.shields.io/badge/status-beta-yellow)

## Features

- **Live monitoring** — Watch sub-agents work in real-time with 500ms refresh
- **Status tracking** — See running, complete, and failed sessions at a glance
- **Session labels** — Shows spawn labels for easy identification
- **Tool activity** — Displays current tool being executed and total tool calls
- **Elapsed time** — Track how long each session has been running
- **Toggle modes** — Switch between "running only" and "all recent" views

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

## Requirements

- Node.js 18+
- OpenClaw installed and running (reads from `~/.openclaw/agents/main/sessions/`)

## How It Works

claw-monitor watches OpenClaw's session directory and `sessions.json` metadata file to:

1. Identify sub-agent sessions (filters out main session)
2. Parse JSONL session logs for tool usage and timing
3. Use OpenClaw's `updatedAt` timestamps for accurate activity detection
4. Display session labels assigned during `sessions_spawn`

## Built With

- [ink](https://github.com/vadimdemedes/ink) — React for CLI apps
- [chokidar](https://github.com/paulmillr/chokidar) — File watching

## License

MIT © Dan Wahlin

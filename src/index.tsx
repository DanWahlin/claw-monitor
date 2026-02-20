#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

// ── Flicker guard ────────────────────────────────────────────────────────
// Ink's clearTerminal path (\x1b[2J\x1b[3J\x1b[H + content) fires on
// EVERY React render when output exceeds terminal height — no same-output
// guard.  We add one: skip the write entirely when the frame is identical
// to the previous one.  When content DOES change the clearTerminal goes
// through unmodified, which correctly handles scrollback.
// ─────────────────────────────────────────────────────────────────────────
const CLEAR_TERMINAL = '\x1b[2J\x1b[3J\x1b[H';
const realWrite = process.stdout.write.bind(process.stdout);
let prevFrame = '';

process.stdout.write = function guardWrite(
  data: string | Uint8Array,
  ...args: any[]
): boolean {
  if (typeof data === 'string' && data.startsWith(CLEAR_TERMINAL)) {
    const content = data.slice(CLEAR_TERMINAL.length);
    if (content === prevFrame) return true;   // identical – skip
    prevFrame = content;
  }
  return realWrite(data, ...args);
} as typeof process.stdout.write;

// Clear screen on start
console.clear();

// Render the app - always pass stdin, it handles TTY detection internally
const { waitUntilExit } = render(<App />);

// Wait for app to exit
waitUntilExit().then(() => {
  console.log('\n👋 Goodbye!\n');
  process.exit(0);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!\n');
  process.exit(0);
});

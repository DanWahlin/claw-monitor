#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

// Intercept Ink's destructive clearTerminal (\x1b[2J\x1b[3J\x1b[H) that fires
// when output height >= terminal rows.  Instead of blanking the whole screen,
// overwrite each line in-place via absolute cursor positioning so the terminal
// never scrolls and no flash occurs.
const CLEAR_TERMINAL = '\x1b[2J\x1b[3J\x1b[H';
const origWrite = process.stdout.write;
const stdout = process.stdout;
process.stdout.write = function (data: any, ...args: any[]) {
  if (typeof data === 'string' && data.includes(CLEAR_TERMINAL)) {
    const content = data.replace(CLEAR_TERMINAL, '');
    const maxRows = stdout.rows || 24;
    const lines = content.split('\n');
    const limit = Math.min(lines.length, maxRows);

    let buf = '';
    for (let i = 0; i < limit; i++) {
      // Move to row i+1 col 1, clear that line, write new content
      buf += `\x1b[${i + 1};1H\x1b[2K${lines[i]}`;
    }
    // Clear any leftover old lines below the new content
    if (limit < maxRows) {
      buf += `\x1b[${limit + 1};1H\x1b[0J`;
    }

    return origWrite.apply(stdout, [buf, ...args] as any);
  }
  return origWrite.apply(stdout, [data, ...args] as any);
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

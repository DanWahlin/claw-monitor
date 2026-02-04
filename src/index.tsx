#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

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

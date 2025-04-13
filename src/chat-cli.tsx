#!/usr/bin/env node
import React from 'react';
import { render, Box, Text } from 'ink';
import { ChatApp } from './chat-ui.js';

// Check if stdin is TTY (interactive terminal)
if (process.stdin.isTTY) {
  // Use standard render with no options for interactive terminals
  render(<ChatApp />);
} else {
  // Fallback for non-TTY environments (like when piping input)
  console.log('This application requires an interactive terminal to run properly.');
  console.log('Please run in a terminal environment that supports interactive input.');
  process.exit(1);
}
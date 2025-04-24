#!/usr/bin/env node
import React from 'react';
import { render, Box, Text } from 'ink';
import { ChatApp } from './chat-ui-sdk.js';

// Parse command line arguments
const args = process.argv.slice(2);
let provider = 'gemini'; // Default provider

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--provider' && i + 1 < args.length) {
    provider = args[i + 1].toLowerCase();
    i++; // Skip the next argument which is the provider value
  }
}

// Force render for development through Claude
// In a real terminal, this would use process.stdin.isTTY check
console.log(`Starting AI SDK-based chat UI with ${provider} provider...`);
render(<ChatApp provider={provider} />);
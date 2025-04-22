#!/usr/bin/env node
import React from 'react';
import { render, Box, Text } from 'ink';
import { ChatApp } from './chat-ui-sdk.js';

// Force render for development through Claude
// In a real terminal, this would use process.stdin.isTTY check
console.log("Starting AI SDK-based chat UI...");
render(<ChatApp />);
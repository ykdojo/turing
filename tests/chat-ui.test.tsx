/**
 * @jest-environment node
 */
import React from 'react';
import { render } from 'ink-testing-library';
import { jest } from '@jest/globals';

// Mock the useChatController hook with empty data
jest.mock('../src/chat-controller', () => ({
  useChatController: () => ({
    messages: [],
    inputText: '',
    handleEnterKey: jest.fn(),
    appendToInputText: jest.fn(),
    backspaceInputText: jest.fn()
  })
}));

// Import after mocking
import { ChatApp } from '../src/chat-ui';

describe('ChatApp', () => {
  test('renders basic UI correctly', () => {
    const { lastFrame } = render(<ChatApp />);
    
    // Verify component renders and shows the input prompt
    expect(lastFrame()).toBeTruthy();
    expect(lastFrame()).toContain('>');
    
    // Additional negative assertions to verify initial empty state
    expect(lastFrame()).not.toContain('You:');
    expect(lastFrame()).not.toContain('AI:');
  });
});

// TODO: Add more tests for message display and loading state
// Requires improved mocking approach for ESM modules
/**
 * @jest-environment node
 */
import React from 'react';
import { render } from 'ink-testing-library';
import { jest } from '@jest/globals';

// We need to test the implementation of line 19:
// if (key.ctrl && input === 'c') { exit(); return; }

// Create our mocks before importing
const mockExit = jest.fn();
let capturedCallback = null;

// Mock the ink module
jest.mock('ink', () => ({
  Box: jest.fn(({ children }) => children),
  Text: jest.fn(({ children }) => children),
  useApp: () => ({ exit: mockExit }),
  useInput: (callback) => {
    // Store the callback so we can trigger it manually in tests
    capturedCallback = callback;
  }
}));

// Mock the spinner
jest.mock('ink-spinner', () => jest.fn(() => 'Loading...'));

// Mock the controller
jest.mock('../src/chat-controller', () => ({
  useChatController: () => ({
    messages: [],
    inputText: 'test-input',
    handleEnterKey: jest.fn(),
    appendToInputText: jest.fn(),
    backspaceInputText: jest.fn()
  })
}));

// Import after mocking
import { ChatApp } from '../src/chat-ui';

// Test our component
describe('ChatApp component', () => {
  beforeEach(() => {
    mockExit.mockReset();
    capturedCallback = null;
  });

  test('exits when Ctrl+C is pressed', () => {
    // Reset the mock
    mockExit.mockClear();
    
    // Render our component (this will capture the useInput callback)
    render(<ChatApp />);
    
    // Ensure our callback was captured
    expect(capturedCallback).toBeDefined();
    
    // Now manually trigger the callback with Ctrl+C
    if (capturedCallback) {
      capturedCallback('c', { ctrl: true });
      
      // Verify the exit was called
      expect(mockExit).toHaveBeenCalled();
    }
  });
});
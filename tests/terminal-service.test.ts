/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';
import { GeminiAPI } from '../src/gemini-api.js';
import { executeCommand } from '../src/services/terminal-service.js';
// Import after mocking
import * as childProcess from 'child_process';

// Create direct mock functions
const mockExec = jest.fn();

// Mock the required dependencies
jest.mock('child_process', () => ({
  exec: (cmd, cb) => {
    mockExec(cmd, cb);
    // Return a mock ChildProcess object
    return { 
      on: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    };
  }
}));

describe('Terminal Service Tests', () => {
  let geminiApi: GeminiAPI;
  let setMessages: jest.Mock;
  let setChatHistory: jest.Mock;
  let setPendingExecution: jest.Mock;
  let setMessageToExecute: jest.Mock;
  let mockChatSession: any;
  
  beforeEach(() => {
    // Initialize a new GeminiAPI instance for each test
    geminiApi = new GeminiAPI('gemini-2.0-flash-lite', undefined, true);
    
    // Mock the sendFunctionResults method to return a simple response
    geminiApi.sendFunctionResults = jest.fn().mockResolvedValue({
      text: "Command result processed",
      functionCalls: []
    });
    
    // Mock the React state setter functions
    setMessages = jest.fn();
    setChatHistory = jest.fn();
    setPendingExecution = jest.fn();
    setMessageToExecute = jest.fn();
    
    // Create a mock chat session
    mockChatSession = {
      sendMessage: jest.fn().mockResolvedValue({
        response: {
          text: () => "Command executed successfully"
        }
      })
    };
    
    // Reset the exec mock for each test
    jest.clearAllMocks();
  });
  
  test('should execute command and handle successful result', async () => {
    // Mock successful command execution
    mockExec.mockImplementationOnce((cmd, callback) => {
      callback(null, "command output", "");
    });
    
    // Execute a test command
    executeCommand(
      "ls -la",
      0,
      0,
      mockChatSession,
      geminiApi,
      setMessages,
      setChatHistory,
      setPendingExecution,
      setMessageToExecute
    );
    
    // Wait for async operations to complete
    await new Promise(r => setTimeout(r, 100));
    
    // Verify exec was called with the correct command
    expect(mockExec).toHaveBeenCalledWith("ls -la", expect.any(Function));
    
    // Verify messages were updated with command result
    expect(setMessages).toHaveBeenCalled();
    
    // First call should update the function call with the result
    const firstCall = setMessages.mock.calls[0][0];
    const updatedMessages = firstCall([{ functionCalls: [{}] }]);
    expect(updatedMessages[0].functionCalls[0].executed).toBe(true);
    expect(updatedMessages[0].functionCalls[0].result).toBe("command output");
    
    // Second call should add a loading indicator
    const secondCall = setMessages.mock.calls[1][0];
    const messagesWithLoading = secondCall([]);
    expect(messagesWithLoading[0].role).toBe('system');
    expect(messagesWithLoading[0].content).toBe('Processing command results...');
    expect(messagesWithLoading[0].isLoading).toBe(true);
    
    // Verify chat history was updated
    expect(setChatHistory).toHaveBeenCalled();
    const chatHistoryCall = setChatHistory.mock.calls[0][0];
    const updatedChatHistory = chatHistoryCall([]);
    expect(updatedChatHistory[0].role).toBe('system');
    expect(updatedChatHistory[0].parts[0].text).toContain('Command executed: ls -la');
    
    // Verify sendFunctionResults was called with the right parameters
    expect(geminiApi.sendFunctionResults).toHaveBeenCalledWith(
      mockChatSession,
      "runTerminalCommand",
      "command output"
    );
    
    // Verify pending execution state was managed correctly
    expect(setPendingExecution).toHaveBeenCalledWith(true);
  });
  
  test('should handle command execution error', async () => {
    // Mock command execution with error
    const mockError = new Error("Command failed");
    mockExec.mockImplementationOnce((cmd, callback) => {
      callback(mockError, "", "");
    });
    
    // Execute a test command that will fail
    executeCommand(
      "invalid-command",
      0,
      0,
      mockChatSession,
      geminiApi,
      setMessages,
      setChatHistory,
      setPendingExecution,
      setMessageToExecute
    );
    
    // Wait for async operations to complete
    await new Promise(r => setTimeout(r, 100));
    
    // Verify exec was called
    expect(mockExec).toHaveBeenCalledWith("invalid-command", expect.any(Function));
    
    // Verify messages were updated with error
    const firstCall = setMessages.mock.calls[0][0];
    const updatedMessages = firstCall([{ functionCalls: [{}] }]);
    expect(updatedMessages[0].functionCalls[0].executed).toBe(true);
    expect(updatedMessages[0].functionCalls[0].result).toBe("Error: Command failed");
    
    // Verify sendFunctionResults was called with the error message
    expect(geminiApi.sendFunctionResults).toHaveBeenCalledWith(
      mockChatSession,
      "runTerminalCommand",
      "Error: Command failed"
    );
  });
  
  test('should handle stderr output', async () => {
    // Mock command execution with stderr output
    mockExec.mockImplementationOnce((cmd, callback) => {
      callback(null, "", "Warning message");
    });
    
    // Execute a test command
    executeCommand(
      "grep nonexistent",
      0,
      0,
      mockChatSession,
      geminiApi,
      setMessages,
      setChatHistory,
      setPendingExecution,
      setMessageToExecute
    );
    
    // Wait for async operations to complete
    await new Promise(r => setTimeout(r, 100));
    
    // Verify exec was called
    expect(mockExec).toHaveBeenCalledWith("grep nonexistent", expect.any(Function));
    
    // Verify messages were updated with stderr output
    const firstCall = setMessages.mock.calls[0][0];
    const updatedMessages = firstCall([{ functionCalls: [{}] }]);
    expect(updatedMessages[0].functionCalls[0].executed).toBe(true);
    expect(updatedMessages[0].functionCalls[0].result).toBe("Warning message");
    
    // Verify sendFunctionResults was called with the stderr message
    expect(geminiApi.sendFunctionResults).toHaveBeenCalledWith(
      mockChatSession,
      "runTerminalCommand",
      "Warning message"
    );
  });
  
  test('should handle API error during function result processing', async () => {
    // Mock successful command execution
    mockExec.mockImplementationOnce((cmd, callback) => {
      callback(null, "command output", "");
    });
    
    // Mock API error during sendFunctionResults
    const mockApiError = new Error("API error");
    geminiApi.sendFunctionResults = jest.fn().mockRejectedValue(mockApiError);
    
    // Execute a test command
    executeCommand(
      "ls -la",
      0,
      0,
      mockChatSession,
      geminiApi,
      setMessages,
      setChatHistory,
      setPendingExecution,
      setMessageToExecute
    );
    
    // Wait for async operations to complete
    await new Promise(r => setTimeout(r, 100));
    
    // Verify exec was called
    expect(mockExec).toHaveBeenCalledWith("ls -la", expect.any(Function));
    
    // Verify error handling in messages
    // Find the call that removes loading indicator and adds error message
    const errorMessageCall = setMessages.mock.calls.find(call => {
      const fn = call[0];
      const result = fn([{isLoading: true}]);
      return result.length > 0 && result[0].role === 'assistant' && result[0].content.includes('Error');
    });
    
    expect(errorMessageCall).toBeDefined();
    
    // Verify pending execution was reset
    expect(setPendingExecution).toHaveBeenCalledWith(false);
    expect(setMessageToExecute).toHaveBeenCalledWith(null);
  });
  
  test('should handle follow-up function calls correctly', async () => {
    // Mock successful command execution
    mockExec.mockImplementationOnce((cmd, callback) => {
      callback(null, "command output", "");
    });
    
    // Mock API response with follow-up function call
    geminiApi.sendFunctionResults = jest.fn().mockResolvedValue({
      text: "Let me also run another command",
      functionCalls: [
        {
          name: "runTerminalCommand",
          args: {
            command: "echo 'follow-up'",
            isSafe: true
          }
        }
      ]
    });
    
    // Execute a test command
    executeCommand(
      "ls -la",
      0,
      0,
      mockChatSession,
      geminiApi,
      setMessages,
      setChatHistory,
      setPendingExecution,
      setMessageToExecute
    );
    
    // Wait for async operations to complete
    await new Promise(r => setTimeout(r, 100));
    
    // Verify exec was called
    expect(mockExec).toHaveBeenCalledWith("ls -la", expect.any(Function));
    
    // Verify that the message with function call was added
    const functionCallMessageCall = setMessages.mock.calls.find(call => {
      const fn = call[0];
      const result = fn([{isLoading: true}]);
      // Look for the call that replaces loading indicator and adds assistant message with function calls
      return result.length > 0 && 
             result[0].role === 'assistant' && 
             result[0].functionCalls !== undefined;
    });
    
    expect(functionCallMessageCall).toBeDefined();
    
    // Verify that timeout was set for auto-execution of safe command
    jest.useFakeTimers();
    jest.advanceTimersByTime(100);
    jest.useRealTimers();
    
    // Should have attempted to execute the follow-up command
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining("echo 'follow-up'"), expect.any(Function));
  });
});
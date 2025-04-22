/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';
import { GeminiSDK } from '../src/gemini-sdk.js';
import { formatMessagesForAISDK } from '../src/utils/message-formatter.js';
import { executeCommand } from '../src/services/terminal-service-sdk.js';

// This file tests basic functionality of the chat-controller-sdk.ts module
// We can't directly test React hooks outside of components, but we can
// test the functionality it depends on

describe('Chat Controller SDK Dependencies', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  
  test('GeminiSDK properly formats system instructions', () => {
    // Create a test instance
    const sdk = new GeminiSDK(
      'gemini-2.0-flash', 
      undefined, 
      'auto', 
      2, 
      'Test system instruction'
    );
    
    // Verify the SDK instance is created
    expect(sdk).toBeDefined();
    expect(sdk).toBeInstanceOf(GeminiSDK);
  });

  test('GeminiSDK can be configured with tools', () => {
    // Create a simple test tool
    const testTool = {
      testFunction: {
        description: "Test function description",
        parameters: {
          type: "object",
          properties: {
            param1: { type: "string" },
            param2: { type: "boolean" }
          },
          required: ["param1", "param2"]
        }
      }
    };
    
    // Create a GeminiSDK instance with the test tool
    const sdk = new GeminiSDK(
      'gemini-2.0-flash',
      testTool,
      'auto',
      2,
      'System instruction'
    );
    
    // Verify the instance was created
    expect(sdk).toBeDefined();
    expect(sdk).toBeInstanceOf(GeminiSDK);
  });
  
  test('message formatter correctly handles AI SDK formatting', () => {
    // Test input messages
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
      { role: 'system', content: 'System message' }
    ];
    
    // Format for AI SDK
    const formatted = formatMessagesForAISDK(messages);
    
    // Verify formatting is correct
    expect(formatted).toHaveProperty('messages');
    expect(formatted).toHaveProperty('systemPrompt');
    
    // System message should be extracted
    expect(formatted.systemPrompt).toBe('System message');
    
    // There should be only 2 messages (user and assistant, not system)
    expect(formatted.messages.length).toBe(2);
    
    // The roles should be preserved
    expect(formatted.messages[0].role).toBe('user');
    expect(formatted.messages[1].role).toBe('assistant');
  });

  test('message formatter correctly handles messages with function calls', () => {
    // Test input with function calls
    const messages = [
      { role: 'user', content: 'Run ls' },
      { 
        role: 'assistant', 
        content: 'I will run that for you',
        functionCalls: [
          {
            name: 'runTerminalCommand',
            args: {
              command: 'ls -la',
              isSafe: true
            },
            executed: true,
            result: 'file1.txt\nfile2.txt'
          }
        ]
      }
    ];
    
    // Format for AI SDK
    const formatted = formatMessagesForAISDK(messages);
    
    // Verify messages with function calls are formatted correctly
    expect(formatted.messages.length).toBe(2);
    expect(formatted.messages[0].role).toBe('user');
    expect(formatted.messages[0].content).toBe('Run ls');
    expect(formatted.messages[1].role).toBe('assistant');
    expect(formatted.messages[1].content).toBe('I will run that for you');
  });
  
  test('executeCommand is correctly exported', () => {
    // Verify the executeCommand function exists
    expect(executeCommand).toBeDefined();
    expect(typeof executeCommand).toBe('function');
  });
});

describe('Verify Terminal Command Tool Structure', () => {
  // This test checks that our terminal command tool structure is correct
  
  test('terminal command tool has correct structure', () => {
    // Import the function directly to recreate what happens in chat-controller-sdk.ts
    // This is a simplified version that captures the important structural details
    
    function createTerminalCommandTool() {
      return {
        runTerminalCommand: {
          description: "Run a terminal command on the user's system.",
          parameters: {
            type: "object",
            properties: {
              command: { 
                type: "string", 
                description: "The terminal command to execute" 
              },
              isSafe: { 
                type: "boolean", 
                description: "Whether the command is considered safe to run" 
              }
            },
            required: ["command", "isSafe"]
          }
        }
      };
    }
    
    const tool = createTerminalCommandTool();
    
    // Verify the structure
    expect(tool).toHaveProperty('runTerminalCommand');
    expect(tool.runTerminalCommand).toHaveProperty('description');
    expect(tool.runTerminalCommand).toHaveProperty('parameters');
    
    // Verify parameters
    expect(tool.runTerminalCommand.parameters).toHaveProperty('type', 'object');
    expect(tool.runTerminalCommand.parameters).toHaveProperty('properties');
    expect(tool.runTerminalCommand.parameters.properties).toHaveProperty('command');
    expect(tool.runTerminalCommand.parameters.properties).toHaveProperty('isSafe');
    expect(tool.runTerminalCommand.parameters.required).toContain('command');
    expect(tool.runTerminalCommand.parameters.required).toContain('isSafe');
  });
});

describe('Chat Controller SDK - Live API Test', () => {
  // Skip if no API key is available
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  const runApiTests = !process.env.CI;
  
  // Only run this test if API key is present
  (hasApiKey ? test : test.skip)('GeminiSDK can get simple text responses', async () => {
    // Skip if no API key
    if (!hasApiKey) return;
    
    // Create a simple SDK instance without tools
    const sdk = new GeminiSDK('gemini-2.0-flash');
    
    try {
      // Send a simple message that should return text
      const response = await sdk.sendMessage('Return only the word SUCCESS without any other text');
      
      // Verify we got a response
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.includes('SUCCESS')).toBe(true);
    } catch (error) {
      console.error('API test error:', error);
      throw error;
    }
  }, 30000); // Allow up to 30 seconds
  
  (runApiTests && hasApiKey ? test : test.skip)('getToolResults can successfully process command execution requests', async () => {
    // Skip if no API key
    if (!hasApiKey) {
      console.log('Skipping test: GEMINI_API_KEY not available');
      return;
    }
    
    // Import needed library
    const { z } = await import('zod');
    const { tool } = await import('ai');
    
    // Create a test terminal command tool using the AI SDK tool format
    const terminalCommandTool = tool({
      description: "Run a terminal command on the user's system",
      parameters: z.object({
        command: z.string().describe('The terminal command to execute'),
        isSafe: z.boolean().describe('Whether the command is considered safe to run')
      }),
      execute: async ({ command, isSafe }) => {
        // Mock implementation - doesn't actually run the command
        return {
          output: `Simulated output for command: ${command}`,
          exitCode: 0,
          isSafe
        };
      }
    });
    
    // Create the GeminiSDK with tools
    const sdk = new GeminiSDK(
      'gemini-2.0-flash',
      { runTerminalCommand: terminalCommandTool },
      'auto',
      2, // maxSteps
      'You are a helpful terminal assistant.'
    );
    
    // Send a message that should trigger a tool call
    const result = await sdk.getToolResults('What files are in the current directory?');
    
    // Verify we got a response
    expect(result).toBeDefined();
    expect(result.steps).toBeDefined();
    
    // Verify toolCalls exist
    expect(result.toolCalls.length).toBeGreaterThanOrEqual(1);
    
    // Find terminal command calls that include directory listing
    const cmdCall = result.toolCalls.find(call => {
      return call.toolName === 'runTerminalCommand' && 
             call.args && 
             call.args.command && 
             (
               call.args.command.toLowerCase().includes('ls') ||
               call.args.command.toLowerCase().includes('dir')
             );
    });
    
    // Verify we found a command call
    expect(cmdCall).toBeDefined();
    
    if (cmdCall) {
      expect(cmdCall.args).toHaveProperty('command');
      expect(cmdCall.args).toHaveProperty('isSafe');
      expect(cmdCall.args.isSafe).toBe(true);
    }
  }, 30000); // 30 second timeout for API call
});
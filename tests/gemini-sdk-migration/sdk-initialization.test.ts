import { describe, it, expect, jest } from '@jest/globals';
import { GeminiSDK } from '../../src/gemini-sdk.js';
import { ToolSet } from 'ai';

describe('GeminiSDK Migration - SDK Initialization', () => {
  // Skip tests if API key is not available
  const hasApiKey = process.env.GEMINI_API_KEY !== undefined;
  
  // Mock terminal command tool
  function createMockTerminalCommandTool(): ToolSet {
    return {
      runTerminalCommand: {
        description: "Run a terminal command on the user's system.",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string", description: "The command to execute" },
            isSafe: { type: "boolean", description: "If it's safe to run" }
          },
          required: ["command", "isSafe"]
        }
      }
    };
  }

  it('should properly initialize GeminiSDK with tools', async () => {
    const modelName = 'gemini-2.0-flash';
    const systemInstruction = 'This is a test system instruction';
    
    // Initialize SDK with tools
    const sdk = new GeminiSDK(
      modelName,
      createMockTerminalCommandTool(),
      'auto',
      2,
      systemInstruction
    );
    
    // Verify the SDK instance was created
    expect(sdk).toBeInstanceOf(GeminiSDK);
  });
  
  it('should have system property set correctly', async () => {
    const modelName = 'gemini-2.0-flash';
    const systemPrompt = 'This is a test system instruction';
    
    // Initialize SDK with tools
    const sdk = new GeminiSDK(
      modelName,
      createMockTerminalCommandTool(),
      'auto',
      2,
      systemPrompt
    );
    
    // Access the private system property using type assertion
    const sdkAny = sdk as any;
    expect(sdkAny.system).toBe(systemPrompt);
  });
});
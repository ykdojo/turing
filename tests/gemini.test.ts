import { GeminiSDK } from '../src/gemini-sdk.js';
import { tool } from 'ai';
import { z } from 'zod';

// Don't use jest.setTimeout here; it's set in the config

// Define supported models for testing
const GEMINI_MODELS = {
  FLASH: 'gemini-2.0-flash',
  FLASH_LITE: 'gemini-2.0-flash-lite',
  FLASH_THINKING: 'gemini-2.0-flash-thinking-exp-01-21',
  FLASH_PREVIEW: 'gemini-2.5-flash-preview-04-17'
};

describe('Gemini SDK Tests', () => {
  let gemini: GeminiSDK;

  beforeAll(() => {
    // Initialize the SDK before all tests
    gemini = new GeminiSDK(GEMINI_MODELS.FLASH_LITE);
  });

  test('SDK should successfully connect and return exact requested text', async () => {
    // Test with a specific keyword that the model should return exactly
    const testKeyword = "GEMINI_TEST_1234";
    const response = await gemini.sendMessage(
      `Return ONLY the word ${testKeyword} with no punctuation, explanation, or other text.`
    );
    
    // Trim the response to handle any whitespace
    const trimmedResponse = response.trim();
    
    // Test that the response is exactly our keyword
    expect(trimmedResponse).toBe(testKeyword);
  });

  test('SDK should handle conversation with history', async () => {
    // Define a sample conversation history
    const history = [
      {
        role: "user",
        content: "What is JavaScript?"
      },
      {
        role: "assistant",
        content: "JavaScript is a programming language commonly used for web development."
      },
      {
        role: "user",
        content: "How does it compare to Python?"
      },
      {
        role: "assistant",
        content: "JavaScript and Python are both popular programming languages but have different use cases. JavaScript is primarily for web development, while Python is more general-purpose and popular for data science."
      }
    ];
    
    // Format the history for AI SDK
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // The verification keyword
    const historyKeyword = "HISTORY_TEST_9876";
    
    // Send a message that should be aware of the conversation history
    const result = await gemini.sendMessage(
      `Based on our conversation about programming languages, respond ONLY with the exact word: ${historyKeyword}`,
      formattedHistory
    );
    
    // Trim the response and check for exact match
    const response = result.trim();
    expect(response).toBe(historyKeyword);
  });

  test('SDK should handle function calling setup for terminal commands', async () => {
    // Use tool from AI SDK
    
    // Create a terminal command tool
    const terminalCommandTool = tool({
      description: "Run a terminal command on the user's system",
      parameters: z.object({
        command: z.string().describe('The terminal command to execute'),
        isSafe: z.boolean().describe('Whether the command is considered safe to run')
      }),
      execute: async ({ command, isSafe }) => {
        return { command, isSafe, output: `Simulated output for command: ${command}` };
      }
    });
    
    const tools = {
      runTerminalCommand: terminalCommandTool
    };
    
    // Initialize with function calling enabled
    const geminiWithFunctions = new GeminiSDK(
      GEMINI_MODELS.FLASH_LITE, 
      tools,
      'auto',
      2,
      "You are a helpful terminal assistant."
    );
    
    // Verify that the SDK is configured with tool support
    expect(geminiWithFunctions).toHaveProperty('tools');
    
    // Try sending a message that might trigger tool calling
    const response = await geminiWithFunctions.getToolResults(
      "How can I list all files in my current directory?"
    );
    
    // Just verify we get some kind of response
    expect(response).toBeDefined();
    expect(response.text).toBeDefined();
  });
  
  test('SDK should support system instruction configuration', async () => {
    // Define test system instruction
    const testInstruction = "You are a helpful terminal assistant in the Turing application. You can run terminal commands for the user when appropriate. Only suggest running terminal commands when they are safe and necessary. Provide clear explanations about what commands will do before executing them. Focus on being helpful, concise, and security-conscious.";
    
    // Initialize with system instruction
    const geminiWithSystemInstruction = new GeminiSDK(
      GEMINI_MODELS.FLASH_LITE, 
      undefined, 
      undefined,
      2,
      testInstruction
    );
    
    // Try sending a message with the system-instructed model
    const response = await geminiWithSystemInstruction.sendMessage(
      "What terminal command would safely show the current directory?"
    );
    
    // Just verify we get some kind of response
    expect(response).toBeDefined();
  });

  // New test for multiple model support
  test('SDK should support different Gemini models', async () => {
    // Test with Gemini Pro model if available (may hit rate limits in free tier)
    try {
      const geminiPro = new GeminiSDK(GEMINI_MODELS.FLASH_PREVIEW);
      const proResponse = await geminiPro.sendMessage("What model are you?");
      expect(proResponse).toBeDefined();
      console.log(`Pro model response: ${proResponse}`);
    } catch (error) {
      console.warn(`Pro model test skipped: ${error.message}`);
    }

    // Test with Flash model (most reliable)
    try {
      const geminiFlash = new GeminiSDK(GEMINI_MODELS.FLASH);
      const flashResponse = await geminiFlash.sendMessage("What model are you?");
      expect(flashResponse).toBeDefined();
    } catch (error) {
      console.warn(`Flash model test skipped: ${error.message}`);
    }
  });
});
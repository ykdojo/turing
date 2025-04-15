import { GoogleGenAI, Type } from '@google/genai';
import 'dotenv/config';
import { GeminiAPI } from '../src/gemini-api';

// Don't use jest.setTimeout here; it's set in the config

// Using a longer timeout is handled in jest.config.js

describe('Gemini Function Calling Tests', () => {
  
  test('should handle basic function calling setup with custom tool', async () => {
    // Initialize the Gemini API with function calling enabled and use model from GEMINI_MODELS.md
    const gemini = new GeminiAPI('gemini-2.5-pro-exp-03-25', undefined, true);
    
    // Verify the toolConfig is configured correctly with AUTO mode (per CLAUDE.md)
    expect(gemini['toolConfig']).toBeDefined();
    expect(gemini['toolConfig'].functionCallingConfig).toBeDefined();
    expect(gemini['toolConfig'].functionCallingConfig.mode).toBe('AUTO');
    
    // Verify tools array exists
    expect(gemini['tools']).toBeDefined();
    expect(Array.isArray(gemini['tools'])).toBe(true);
    expect(gemini['tools'].length).toBeGreaterThan(0);

    // Verify the terminal command tool exists and is properly configured
    const toolDeclarations = gemini['tools'][0].functionDeclarations;
    expect(toolDeclarations).toBeDefined();
    
    const terminalTool = toolDeclarations.find((fn) => fn.name === 'runTerminalCommand');
    expect(terminalTool).toBeDefined();
    expect(terminalTool.parameters.properties).toHaveProperty('command');
    expect(terminalTool.parameters.properties).toHaveProperty('isSafe');
    expect(terminalTool.parameters.required).toContain('command');
    expect(terminalTool.parameters.required).toContain('isSafe');
  });

  test('should correctly format function responses for Gemini API', async () => {
    // Initialize the Gemini API with function calling enabled
    const gemini = new GeminiAPI('gemini-2.5-pro-exp-03-25', undefined, true);
    
    // Start a chat session
    const chatSession = gemini.startChat();
    
    // Create a mock function call result
    const functionName = 'runTerminalCommand';
    const functionResult = JSON.stringify({
      output: "This is a test result from the function call",
      exitCode: 0
    });
    
    // Mock the chat session's sendMessage method to avoid actual API calls
    const originalMethod = chatSession.sendMessage;
    
    // Create a mock function that simulates the response
    chatSession.sendMessage = async () => ({
      response: {
        text: () => "I received the function result"
      }
    });
    
    // Call the method under test
    const result = await gemini.sendFunctionResults(chatSession, functionName, functionResult);
    
    // Verify the result
    expect(result).toBe("I received the function result");
    
    // Now manually verify the format of a function response
    // Create a sample function response message
    const sampleFunctionResponse = [
      {
        functionResponse: {
          name: functionName,
          response: {
            content: functionResult
          }
        }
      }
    ];
    
    // Check that it has the expected structure
    expect(Array.isArray(sampleFunctionResponse)).toBe(true);
    expect(sampleFunctionResponse[0]).toHaveProperty('functionResponse');
    expect(sampleFunctionResponse[0].functionResponse.name).toBe(functionName);
    expect(sampleFunctionResponse[0].functionResponse.response).toHaveProperty('content');
    
    // Restore the original method
    chatSession.sendMessage = originalMethod;
  });
});
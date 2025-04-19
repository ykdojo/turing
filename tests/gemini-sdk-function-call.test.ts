import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { generateText, tool } from 'ai';
import { GeminiSDK } from '../src/gemini-sdk.js';

describe('GeminiSDK Function Calling Tests', () => {
  // Skip if running in CI environment (API key might not be available)
  const runApiTests = !process.env.CI;
  
  // Models that support function calling according to GEMINI_MODELS.md
  const functionCallingModels = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-pro-exp-03-25'
  ];
  
  test('GeminiSDK class should be properly initialized', () => {
    expect(() => {
      new GeminiSDK('gemini-2.0-flash');
    }).not.toThrow();
  });
  
  test('GeminiSDK can be initialized with tools', () => {
    const tools = {
      weather: tool({
        description: 'Get the weather in a location',
        parameters: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72,
          condition: 'Sunny',
          humidity: '45%'
        }),
      }),
    };
    
    const sdk = new GeminiSDK('gemini-2.0-flash', tools, 'auto', 2);
    expect(sdk).toBeDefined();
  });
  
  // Test function calling with each supported model from GEMINI_MODELS.md
  describe.each(functionCallingModels)('Function calling with model: %s', (modelName) => {
    (runApiTests ? test : test.skip)(`should perform function calls using model ${modelName}`, async () => {
      // Skip if no API key is available
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping test: GEMINI_API_KEY not available');
        return;
      }
      
      // Define the weather tool
      const weatherTool = tool({
        description: 'Get the weather in a location',
        parameters: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
          condition: 'Sunny',
          humidity: '45%'
        }),
      });
      
      // Create the GeminiSDK with tools
      const gemini = new GeminiSDK(
        modelName,
        { weather: weatherTool },
        'required', // Force tool usage
        2 // Allow up to 2 steps
      );
      
      // Send a message that should trigger a tool call
      const result = await gemini.getToolResults('What is the weather in San Francisco?');
      
      // Verify we got a response (text might be empty depending on model behavior)
      expect(result.text).toBeDefined();
      
      // Verify tool calls and results
      expect(result.toolCalls.length).toBeGreaterThanOrEqual(1);
      
      // Check if at least one tool call is for weather
      const weatherCall = result.toolCalls.find(
        call => call.toolName === 'weather' && 
        call.args && 
        call.args.location && 
        call.args.location.toLowerCase().includes('san francisco')
      );
      
      expect(weatherCall).toBeDefined();
      
      // Verify at least one tool result exists
      expect(result.toolResults.length).toBeGreaterThanOrEqual(1);
      
      // Find the matching tool result
      const weatherResult = result.toolResults.find(
        res => res.toolName === 'weather' && res.result
      );
      
      expect(weatherResult).toBeDefined();
      if (weatherResult) {
        expect(weatherResult.result).toHaveProperty('temperature');
      }
    }, 45000); // Increase timeout to 45 seconds for API call (some models may be slower)
  });
  
  (runApiTests ? test : test.skip)('AI SDK tool calling should work directly with generateText', async () => {
    // Skip if no API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.log('Skipping test: GEMINI_API_KEY not available');
      return;
    }
    
    const result = await generateText({
      model: google('gemini-2.0-flash'),
      tools: {
        weather: tool({
          description: 'Get the weather in a location',
          parameters: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => ({
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
            condition: 'Sunny',
            humidity: '45%'
          }),
        }),
      },
      toolChoice: 'required', // Force the model to call a tool
      prompt: 'What is the weather in San Francisco?',
      maxSteps: 2, // Allow up to 2 steps (tool call + response)
    });
    
    // Verify we got a result with steps
    expect(result).toBeDefined();
    expect(result.steps).toBeDefined();
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    
    // We should have at least one tool call
    const allToolCalls = result.steps.flatMap(step => step.toolCalls || []);
    expect(allToolCalls.length).toBeGreaterThanOrEqual(1);
    
    // Verify at least one tool call is for weather in San Francisco
    const weatherCall = allToolCalls.find(call => {
      return call.toolName === 'weather' && 
             call.args && 
             typeof call.args.location === 'string' && 
             call.args.location.toLowerCase().includes('san francisco');
    });
    
    expect(weatherCall).toBeDefined();
  }, 30000); // 30 second timeout for API call
  
  (runApiTests ? test : test.skip)('GeminiSDK should support terminal command tool', async () => {
    // Skip if no API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.log('Skipping test: GEMINI_API_KEY not available');
      return;
    }
    
    // Define the terminal command tool
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
    
    // Create the GeminiSDK with the terminal command tool
    const gemini = new GeminiSDK(
      'gemini-2.0-flash',
      { runTerminalCommand: terminalCommandTool },
      'required', // Force tool usage
      2 // Allow up to 2 steps
    );
    
    // Send a message that should trigger a terminal command
    const result = await gemini.getToolResults('List the files in the current directory using ls');
    
    // Verify we got a response
    expect(result).toBeDefined();
    expect(result.steps).toBeDefined();
    
    // Verify tool calls exist
    expect(result.toolCalls.length).toBeGreaterThanOrEqual(1);
    
    // Find a terminal command call that includes 'ls'
    const cmdCall = result.toolCalls.find(call => {
      return call.toolName === 'runTerminalCommand' && 
             call.args && 
             call.args.command && 
             call.args.command.toLowerCase().includes('ls');
    });
    
    // If we found a valid terminal command call, verify it
    if (cmdCall) {
      expect(cmdCall.args).toHaveProperty('command');
      expect(cmdCall.args).toHaveProperty('isSafe');
      
      // Find the corresponding tool result
      const cmdResult = result.toolResults.find(
        res => res.toolName === 'runTerminalCommand' && 
               res.toolCallId === cmdCall.toolCallId
      );
      
      if (cmdResult) {
        expect(cmdResult.result).toHaveProperty('output');
        expect(cmdResult.result).toHaveProperty('exitCode');
      }
    }
  }, 30000); // 30 second timeout for API call
});
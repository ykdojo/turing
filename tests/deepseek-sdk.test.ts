import { DeepseekSDK } from '../src/deepseek-sdk.js';
import { z } from 'zod';
import { tool, generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { jest } from '@jest/globals';

// Using individual test.skip to exclude these tests from the automatic test suite
// To run manually: npx jest tests/deepseek-sdk.test.ts --testNamePattern="DeepseekSDK"
describe('DeepseekSDK', () => {
  // Mock environment variables
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // We're using the actual API key from the .env file for the tests
    // The dotenv package is imported in the DeepseekSDK class
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  describe('constructor', () => {
    it('should throw an error if DEEPSEEK_API_KEY is not set', () => {
      delete process.env.DEEPSEEK_API_KEY;
      expect(() => new DeepseekSDK()).toThrow('DEEPSEEK_API_KEY not found in environment');
    });
    
    it('should initialize with default parameters', () => {
      const sdk = new DeepseekSDK();
      expect(sdk).toBeInstanceOf(DeepseekSDK);
    });
    
    it('should initialize with custom parameters', () => {
      const tools = {
        testTool: {
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string' }
            },
            required: ['input']
          }
        }
      };
      
      const sdk = new DeepseekSDK('deepseek-v3', tools, 'auto', 3);
      expect(sdk).toBeInstanceOf(DeepseekSDK);
    });
  });
  
  describe('sendMessage', () => {
    it('should be defined', () => {
      const sdk = new DeepseekSDK();
      expect(sdk.sendMessage).toBeDefined();
    });
    
    it('should connect and get response from deepseek-v3', async () => {
      // Skip the test if we can't get a valid API key
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not available');
        return;
      }
      
      const testKeyword = "DEEPSEEK_SDK_TEST";
      const testPrompt = `Return ONLY the word ${testKeyword} with no other text.`;
      
      const sdk = new DeepseekSDK("deepseek-chat");
      const response = await sdk.sendMessage(testPrompt);
      
      expect(response.trim()).toBe(testKeyword);
    }, 30000);
  });
  
  describe('getToolResults', () => {
    it('should throw an error if tools are not provided', async () => {
      const sdk = new DeepseekSDK();
      await expect(sdk.getToolResults('test prompt')).rejects.toThrow(
        'Tools must be provided to use getToolResults'
      );
    });
    
    it('should get tool results when tools are provided', async () => {
      // Skip the test if we can't get a valid API key
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not available');
        return;
      }
      
      const testKeyword = "DEEPSEEK_TOOL_TEST";
      const testPrompt = `Use the testTool with input: "${testKeyword}"`;
      
      // Define a simple test tool using AI SDK's tool function
      const testTool = tool({
        description: 'A test tool that echoes input',
        parameters: z.object({
          input: z.string().describe('The input to echo back')
        }),
        execute: async ({ input }) => ({
          received: input,
          echoed: `Tool received: ${input}`
        })
      });
      
      const sdk = new DeepseekSDK('deepseek-chat', { testTool }, 'required', 2);
      const result = await sdk.getToolResults(testPrompt);
      
      // Verify we got a response
      expect(result).toBeDefined();
      
      // Verify the basic response structure
      expect(typeof result.text).toBe('string');
      expect(Array.isArray(result.toolCalls)).toBe(true);
      expect(Array.isArray(result.toolResults)).toBe(true);
      expect(Array.isArray(result.steps)).toBe(true);
      
      // Verify tool calls exist
      expect(result.toolCalls.length).toBeGreaterThanOrEqual(1);
      
      // Check if at least one tool call is for testTool with the correct input
      const testToolCall = result.toolCalls.find(
        call => call.toolName === 'testTool' && 
        call.args && 
        call.args.input && 
        call.args.input.includes(testKeyword)
      );
      
      expect(testToolCall).toBeDefined();
      
      // Verify at least one tool result exists
      expect(result.toolResults.length).toBeGreaterThanOrEqual(1);
      
      // Find the matching tool result
      const testToolResult = result.toolResults.find(
        res => res.toolName === 'testTool' && 
               res.toolCallId === testToolCall?.toolCallId
      );
      
      expect(testToolResult).toBeDefined();
      if (testToolResult) {
        expect(testToolResult.result).toHaveProperty('received');
        expect(testToolResult.result).toHaveProperty('echoed');
        expect(testToolResult.result.received).toContain(testKeyword);
      }
    }, 30000);
    
    it('should support terminal command tool', async () => {
      // Skip if no API key is available
      if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Skipping test: DEEPSEEK_API_KEY not available');
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
      
      // Create the DeepseekSDK with the terminal command tool
      const sdk = new DeepseekSDK(
        'deepseek-chat',
        { runTerminalCommand: terminalCommandTool },
        'required', // Force tool usage
        2 // Allow up to 2 steps
      );
      
      // Send a message that should trigger a terminal command
      const result = await sdk.getToolResults('List the files in the current directory using ls');
      
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
  
  it('AI SDK tool calling should work directly with generateText', async () => {
    // Skip if no API key is available
    if (!process.env.DEEPSEEK_API_KEY) {
      console.log('Skipping test: DEEPSEEK_API_KEY not available');
      return;
    }
    
    const result = await generateText({
      model: deepseek('deepseek-chat'),
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
      prompt: 'What is the weather in Paris?',
      maxSteps: 2, // Allow up to 2 steps (tool call + response)
    });
    
    // Verify we got a result with steps
    expect(result).toBeDefined();
    expect(result.steps).toBeDefined();
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    
    // We should have at least one tool call
    const allToolCalls = result.steps.flatMap(step => step.toolCalls || []);
    expect(allToolCalls.length).toBeGreaterThanOrEqual(1);
    
    // Verify at least one tool call is for weather in Paris
    const weatherCall = allToolCalls.find(call => {
      return call.toolName === 'weather' && 
             call.args && 
             typeof call.args.location === 'string' && 
             call.args.location.toLowerCase().includes('paris');
    });
    
    expect(weatherCall).toBeDefined();
  }, 30000); // 30 second timeout for API call
});
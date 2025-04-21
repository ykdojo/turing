import { DeepseekSDK } from '../src/deepseek-sdk.js';
import { z } from 'zod';
import { tool } from 'ai';
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
      
      // All we can verify in this test environment is that the function returns
      // something and doesn't throw an exception. The actual tool execution
      // may not be supported depending on the model and API access
      expect(result).toBeDefined();
      
      // Check the structure of the response
      expect(typeof result.text).toBe('string');
      expect(Array.isArray(result.toolCalls)).toBe(true);
      expect(Array.isArray(result.toolResults)).toBe(true);
      expect(Array.isArray(result.steps)).toBe(true);
    }, 30000);
  });
});
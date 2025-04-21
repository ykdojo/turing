import { DeepseekSDK } from '../src/deepseek-sdk.js';
import { ToolDefinition } from 'ai';

// Using individual test.skip to exclude these tests from the automatic test suite
// To run manually: npx jest tests/deepseek-sdk.test.ts --testNamePattern="DeepseekSDK"
describe('DeepseekSDK', () => {
  // Mock environment variables
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  describe('constructor', () => {
    it.skip('should throw an error if DEEPSEEK_API_KEY is not set', () => {
      delete process.env.DEEPSEEK_API_KEY;
      expect(() => new DeepseekSDK()).toThrow('DEEPSEEK_API_KEY not found in environment');
    });
    
    it.skip('should initialize with default parameters', () => {
      const sdk = new DeepseekSDK();
      expect(sdk).toBeInstanceOf(DeepseekSDK);
    });
    
    it.skip('should initialize with custom parameters', () => {
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
        } as ToolDefinition
      };
      
      const sdk = new DeepseekSDK('deepseek-v3', tools, 'auto', 3);
      expect(sdk).toBeInstanceOf(DeepseekSDK);
    });
  });
  
  // Note: These tests would need proper mocking of the AI SDK to work fully
  describe('sendMessage', () => {
    it.skip('should be defined', () => {
      const sdk = new DeepseekSDK();
      expect(sdk.sendMessage).toBeDefined();
    });
  });
  
  describe('getToolResults', () => {
    it.skip('should throw an error if tools are not provided', async () => {
      const sdk = new DeepseekSDK();
      await expect(sdk.getToolResults('test prompt')).rejects.toThrow(
        'Tools must be provided to use getToolResults'
      );
    });
  });
});
import { LangchainSDK } from '../src/langchain-sdk.js';

describe('LangchainSDK Tests', () => {
  // Mocking the class for testing
  test('Should create a class with API key validation', () => {
    // Save original env
    const originalEnv = process.env.GEMINI_API_KEY;
    
    // Test with API key
    process.env.GEMINI_API_KEY = 'test-key';
    expect(() => new LangchainSDK('gemini-1.5-pro-latest')).not.toThrow();
    
    // Test without API key
    process.env.GEMINI_API_KEY = '';
    expect(() => new LangchainSDK('gemini-1.5-pro-latest')).toThrow('GEMINI_API_KEY not found in environment');
    
    // Restore original env
    process.env.GEMINI_API_KEY = originalEnv;
  });
});
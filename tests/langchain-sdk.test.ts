import { LangchainSDK } from '../src/langchain-sdk.js';

describe('LangchainSDK Tests', () => {
  // Test API key validation
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
  
  // Test actual message sending (only run if API key is available)
  test('Should successfully connect and get a response', async () => {
    // Skip test if no API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.log('Skipping test: No GEMINI_API_KEY available');
      return;
    }
    
    const langchain = new LangchainSDK('gemini-1.5-pro-latest');
    const testKeyword = "LANGCHAIN_SDK_TEST";
    const response = await langchain.sendMessage(
      `Return ONLY the word ${testKeyword} with no other text.`
    );
    
    expect(response.trim()).toBe(testKeyword);
  }, 30000); // Increase timeout to 30 seconds for API call
});
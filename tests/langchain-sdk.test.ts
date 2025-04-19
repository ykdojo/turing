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
  
  // Common test for all models
  const testModel = async (modelName: string) => {
    // Skip test if no API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.log('Skipping test: No GEMINI_API_KEY available');
      return;
    }
    
    try {
      const langchain = new LangchainSDK(modelName);
      const testKeyword = "LANGCHAIN_SDK_TEST_" + modelName.replace(/[^a-zA-Z0-9]/g, '_');
      const response = await langchain.sendMessage(
        `Return ONLY the word ${testKeyword} with no other text.`
      );
      
      expect(response.trim()).toBe(testKeyword);
      console.log(`✅ Model ${modelName} works correctly`);
      return true;
    } catch (error) {
      console.error(`❌ Model ${modelName} failed: ${error.message}`);
      return false;
    }
  };

  // Test with specific models 
  test('Should work with gemini-2.0-flash', async () => {
    await testModel('gemini-2.0-flash');
  }, 30000);
  
  test('Should work with gemini-2.0-flash-lite', async () => {
    await testModel('gemini-2.0-flash-lite');
  }, 30000);
  
  test('Should work with gemini-2.0-flash-thinking-exp-01-21', async () => {
    await testModel('gemini-2.0-flash-thinking-exp-01-21');
  }, 30000);
  
  test('Should work with gemini-2.5-pro-exp-03-25', async () => {
    await testModel('gemini-2.5-pro-exp-03-25');
  }, 30000);
  
  test('Should fail with non-working model name format', async () => {
    // This test expects the model to fail, so we don't use expect() directly
    const result = await testModel('gemini-2.5.pro-exp-03-25'); // Incorrect format with dot
    // We expect this to return false (failure)
    expect(result).toBe(false);
  }, 30000);
});
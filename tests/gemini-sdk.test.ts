import { GeminiSDK } from '../src/gemini-sdk.js';

describe('GeminiSDK Tests', () => {
  const testKeyword = "GEMINI_SDK_TEST";
  const testPrompt = `Return ONLY the word ${testKeyword} with no other text.`;
  
  const models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-pro-exp-03-25'
  ];

  test.each(models)('Should connect and get response from %s', async (modelName) => {
    const gemini = new GeminiSDK(modelName);
    const response = await gemini.sendMessage(testPrompt);
    
    expect(response.trim()).toBe(testKeyword);
  });
});
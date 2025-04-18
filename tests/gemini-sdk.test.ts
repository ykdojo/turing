import { GeminiSDK } from '../src/gemini-sdk.js';

describe('GeminiSDK Tests', () => {
  let gemini: GeminiSDK;

  beforeAll(() => {
    gemini = new GeminiSDK('gemini-1.5-pro-latest');
  });

  test('Should successfully connect and get a response', async () => {
    const testKeyword = "GEMINI_SDK_TEST";
    const response = await gemini.sendMessage(
      `Return ONLY the word ${testKeyword} with no other text.`
    );
    
    expect(response.trim()).toBe(testKeyword);
  });
});
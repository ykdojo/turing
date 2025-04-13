import { GeminiAPI } from '../src/gemini-api.js';

// Don't use jest.setTimeout here; it's set in the config

describe('Gemini API Tests', () => {
  let gemini: GeminiAPI;

  beforeAll(() => {
    // Initialize the API before all tests
    gemini = new GeminiAPI("gemini-2.5-pro-exp-03-25");
  });

  test('API should successfully connect and return exact requested text', async () => {
    // Test with a specific keyword that the model should return exactly
    const testKeyword = "GEMINI_TEST_1234";
    const response = await gemini.sendMessage(
      `Return ONLY the word ${testKeyword} with no punctuation, explanation, or other text.`
    );
    
    // Trim the response to handle any whitespace
    const trimmedResponse = response.trim();
    
    // Test that the response is exactly our keyword
    expect(trimmedResponse).toBe(testKeyword);
  });
});
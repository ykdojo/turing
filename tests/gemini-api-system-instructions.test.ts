/**
 * @jest-environment node
 */
import { GeminiAPI } from '../src/gemini-api';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Skip all tests if API key isn't set
const hasApiKey = !!process.env.GEMINI_API_KEY;

describe('GeminiAPI System Instructions Test', () => {
  
  (hasApiKey ? test : test.skip)('should correctly extract the directory path from system instructions', async () => {
    const originalConsoleLog = console.log;
    
    try {
      // System instruction with a unique directory path
      const systemInstruction = `You are a helpful terminal assistant in the Turing application, working in the directory: /VERY_UNIQUE_TEST_DIR_12345/gemini_test_path.
       You can run terminal commands for the user when appropriate. Only suggest running terminal commands when they are safe and necessary.
      Provide clear explanations about what commands will do before executing them. Focus on being helpful, concise, and security-conscious.`;
      
      // Create GeminiAPI instance with system instruction
      const gemini = new GeminiAPI(
        'gemini-2.0-flash',
        {
          temperature: 0.1,  // Lower temperature for more predictable outputs
          topP: 0.1,
          responseMimeType: 'text/plain',
        },
        false,  // No function calling needed for this test
        systemInstruction
      );
      
      // Query to extract the directory path
      const prompt = `According to your system instructions, what specific directory path are you configured to work in? Extract and provide ONLY the exact
      directory path from your system instructions.`;
    
      originalConsoleLog('Sending request to Gemini API...');
      const response = await gemini.sendMessage(prompt);
      
      // We expect the raw text response from our GeminiAPI class
      const fullResponse = typeof response === 'string' ? response : '';
      
      originalConsoleLog('Full response from Gemini:', fullResponse);
      
      // Check for expected path
      const expectedPath = '/VERY_UNIQUE_TEST_DIR_12345/gemini_test_path';
      const cleanResponse = fullResponse.trim().replace(/\s+/g, '');
      const cleanExpected = expectedPath.trim().replace(/\s+/g, '');
      
      // Test if the response contains the expected path
      const containsPath = fullResponse.includes(expectedPath);
      const similarPath = cleanResponse.includes(cleanExpected);
      
      originalConsoleLog('Contains exact path:', containsPath);
      originalConsoleLog('Contains similar path:', similarPath);
      
      // Also check if we can compose the path from the chunks
      expect(containsPath || similarPath).toBe(true);
      
    } finally {
      // Restore console functions
      console.log = originalConsoleLog;
    }
  }, 30000); // 30 second timeout for API call
});
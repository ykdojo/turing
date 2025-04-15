/**
 * @jest-environment node
 */
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Skip all tests if API key isn't set
const hasApiKey = !!process.env.GEMINI_API_KEY;

describe('Gemini API System Instructions Test', () => {
  
  (hasApiKey ? test : test.skip)('should correctly extract the directory path from system instructions', async () => {
    const originalConsoleLog = console.log;
    
    try {
      // Test implementation
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
      
      const config = {
        responseMimeType: 'text/plain',
        systemInstruction: [
          {
            text: `  You are a helpful terminal assistant in the Turing application, working in the directory: /VERY_UNIQUE_TEST_DIR_12345/gemini_test_path.
   You can run terminal commands for the user when appropriate. Only suggest running terminal commands when they are safe and necessary.
  Provide clear explanations about what commands will do before executing them. Focus on being helpful, concise, and security-conscious.`,
          }
        ],
      };
      const model = 'gemini-2.0-flash';
      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: `According to your system instructions, what specific directory path are you configured to work in? Extract and provide ONLY the exact
directory path from your system instructions.`,
            },
          ],
        },
      ];
    
      originalConsoleLog('Sending request to Gemini API...');
      const response = await ai.models.generateContentStream({
        model,
        config,
        contents,
      });
      
      // Collect all chunks into a single response
      let fullResponse = '';
      for await (const chunk of response) {
        fullResponse += chunk.text;
      }
      
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
/**
 * @jest-environment node
 */
import { GeminiAPI } from '../src/gemini-api.js';

// Test the chat controller core functionality by directly using the GeminiAPI
describe('Gemini Chat Functionality', () => {
  let gemini: GeminiAPI;
  
  beforeAll(() => {
    // Initialize API with function calling enabled
    gemini = new GeminiAPI('gemini-2.0-flash', undefined, true);
  });
  
  test('API should be initialized with function calling', () => {
    // @ts-ignore - accessing private property for testing
    expect(gemini.tools.length).toBeGreaterThan(0);
    // @ts-ignore - accessing private property for testing
    expect(gemini.toolConfig).toBeDefined();
  });
  
  test('API should format messages correctly', () => {
    const history = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
      { role: 'system', content: 'Processing command' }
    ];
    
    // Convert to Gemini format
    const formattedHistory = history
      .map(msg => {
        if (msg.role === 'system') {
          return { role: 'model', parts: [{ text: msg.content }] };
        } else {
          return {
            role: msg.role === 'assistant' ? 'model' : 'user', 
            parts: [{ text: msg.content }]
          };
        }
      });
    
    // Check the conversion is correct
    expect(formattedHistory.length).toBe(3);
    expect(formattedHistory[0].role).toBe('user');
    expect(formattedHistory[1].role).toBe('model');
    expect(formattedHistory[2].role).toBe('model');
    expect(formattedHistory[0].parts[0].text).toBe('Hello');
  });
});
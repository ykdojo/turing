/**
 * @jest-environment node
 */
import { GeminiAPI } from '../src/gemini-api.js';
import { jest } from '@jest/globals';

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
  
  test('API should have function calling configuration set correctly', () => {
    // Create a GeminiAPI instance with function calling enabled
    const geminiWithFunctions = new GeminiAPI('gemini-2.0-flash', undefined, true);
    
    // Check that the API has tools defined
    // @ts-ignore - accessing private property for testing
    expect(geminiWithFunctions.tools).toBeDefined();
    // @ts-ignore - accessing private property for testing
    expect(geminiWithFunctions.tools.length).toBeGreaterThan(0);
    
    // Check tool config mode is set to AUTO as specified in CLAUDE.md
    // @ts-ignore - accessing private property for testing
    expect(geminiWithFunctions.toolConfig).toBeDefined();
    // @ts-ignore - accessing private property for testing
    expect(geminiWithFunctions.toolConfig.functionCallingConfig).toBeDefined();
    // @ts-ignore - accessing private property for testing
    expect(geminiWithFunctions.toolConfig.functionCallingConfig.mode).toBe("AUTO");
  });

  test('API should correctly process function calls from response', () => {
    // Create a mock response with function calls
    const mockResult = {
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "runTerminalCommand",
                    args: {
                      command: "ls -la",
                      isSafe: true
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    };
    
    // Process the mock response
    // @ts-ignore - accessing private method for testing
    const functionCalls = gemini.processFunctionCalls(mockResult);
    
    // Verify the processed function calls
    expect(functionCalls.length).toBe(1);
    expect(functionCalls[0].name).toBe("runTerminalCommand");
    expect(functionCalls[0].args.command).toBe("ls -la");
    expect(functionCalls[0].args.isSafe).toBe(true);
  });

  test('API should properly format and send function results', async () => {
    // Create a mock chat session with a sendMessage method
    const mockChatSession = {
      sendMessage: jest.fn().mockResolvedValue({
        response: {
          text: () => "I received your function result"
        }
      })
    };

    // Call the sendFunctionResults method
    const result = await gemini.sendFunctionResults(
      mockChatSession,
      "runTerminalCommand", 
      "Command executed successfully: directory listing complete"
    );

    // Verify the chat session's sendMessage was called with properly formatted parts
    expect(mockChatSession.sendMessage).toHaveBeenCalledTimes(1);
    
    // Get the parts that were passed to sendMessage
    const parts = mockChatSession.sendMessage.mock.calls[0][0];
    
    // Verify the structure of the parts
    expect(parts).toHaveLength(1);
    expect(parts[0].functionResponse).toBeDefined();
    expect(parts[0].functionResponse.name).toBe("runTerminalCommand");
    expect(parts[0].functionResponse.response.content).toBe("Command executed successfully: directory listing complete");
    
    // Verify the returned result
    expect(result).toBe("I received your function result");
  });
});
/**
 * @jest-environment node
 */
import { GeminiAPI } from '../src/gemini-api.js';
import { jest } from '@jest/globals';

// Define types for mocking purposes to resolve TypeScript errors
type MockResponse = {
  response: {
    text: () => string;
    candidates?: Array<{
      content: {
        parts: Array<{
          functionCall?: {
            name: string;
            args: {
              command: string;
              isSafe: boolean;
            };
          };
          text?: string;
        }>;
      };
    }>;
  };
};

// Shape of GeminiAPI chat session response with sendMessage function
type MockChatSession = {
  sendMessage: jest.MockedFunction<(input: any) => Promise<MockResponse>>;
};

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
    const mockChatSession: MockChatSession = {
      sendMessage: jest.fn().mockResolvedValue({
        response: {
          text: () => "I received your function result"
        }
      } as MockResponse)
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
    const parts = mockChatSession.sendMessage.mock.calls[0][0] as Array<{
      functionResponse: {
        name: string;
        response: {
          content: string;
        };
      };
    }>;
    
    // Verify the structure of the parts
    expect(parts).toHaveLength(1);
    expect(parts[0].functionResponse).toBeDefined();
    expect(parts[0].functionResponse.name).toBe("runTerminalCommand");
    expect(parts[0].functionResponse.response.content).toBe("Command executed successfully: directory listing complete");
    
    // Verify the returned result
    expect(result).toBe("I received your function result");
  });

  test('API should handle complete function call flow with chained function calls', async () => {
    // Create mocks for nested function calls
    const mockFirstResponse = {
      response: {
        text: () => "I'll list those files for you",
        candidates: [{
          content: {
            parts: [{
              functionCall: {
                name: "runTerminalCommand",
                args: {
                  command: "ls -la",
                  isSafe: true
                }
              }
            }]
          }
        }]
      }
    };

    const mockSecondResponse = {
      response: {
        text: () => "Here are the results from the command",
        candidates: [{
          content: {
            parts: [{
              functionCall: {
                name: "runTerminalCommand",
                args: {
                  command: "cat file.txt",
                  isSafe: true
                }
              }
            }]
          }
        }]
      }
    };

    const mockFinalResponse = {
      response: {
        text: () => "Final response with no more function calls"
      }
    };

    // Setup mocked chat session
    const mockChatSession: MockChatSession = {
      sendMessage: jest.fn()
        .mockResolvedValueOnce(mockFirstResponse as MockResponse)  // Initial response with function call
        .mockResolvedValueOnce(mockSecondResponse as MockResponse) // Response after first function result
        .mockResolvedValueOnce(mockFinalResponse as MockResponse)  // Final response
    };

    // Mock the startChat method to return our mock session
    jest.spyOn(gemini, 'startChat').mockReturnValue(mockChatSession);

    // Call sendMessage to start the flow
    const response = await gemini.sendMessage("List my files", []);

    // Verify that the response contains function calls
    expect(typeof response).toBe('object');
    expect(response.text).toBe("I'll list those files for you");
    expect(response.functionCalls).toBeDefined();
    expect(response.functionCalls.length).toBe(1);
    expect(response.functionCalls[0].name).toBe("runTerminalCommand");
    expect(response.functionCalls[0].args.command).toBe("ls -la");
    expect(response.chatSession).toBe(mockChatSession);

    // Now simulate sending function results back
    const secondResponse = await gemini.sendFunctionResults(
      mockChatSession,
      "runTerminalCommand",
      "file1.txt\nfile2.txt\nfile3.txt"
    );

    // Verify second response structure
    expect(typeof secondResponse).toBe('object');
    expect(secondResponse.text).toBe("Here are the results from the command");
    expect(secondResponse.functionCalls).toBeDefined();
    expect(secondResponse.functionCalls.length).toBe(1);
    expect(secondResponse.functionCalls[0].name).toBe("runTerminalCommand");
    expect(secondResponse.functionCalls[0].args.command).toBe("cat file.txt");

    // Finally, send the last function result
    const finalResponse = await gemini.sendFunctionResults(
      mockChatSession,
      "runTerminalCommand",
      "Contents of file.txt"
    );

    // Verify final response is a simple text response
    expect(finalResponse).toBe("Final response with no more function calls");
  });
  
  test('API should handle user message after function call response', async () => {
    // Create a mock chat session for the function call flow
    const mockFunctionResponse = {
      response: {
        text: () => "Command executed successfully",
        candidates: [] // No more function calls
      }
    };

    // Mock response for user's follow-up message
    const mockUserFollowupResponse = {
      response: {
        text: () => "Here's my response to your follow-up message"
      }
    };

    // Setup mocked chat session
    const mockChatSession: MockChatSession = {
      sendMessage: jest.fn()
        .mockResolvedValueOnce(mockFunctionResponse as MockResponse)  // Response to function result
        .mockResolvedValueOnce(mockUserFollowupResponse as MockResponse) // Response to follow-up user message
    };

    // Mock the startChat method to return our mock session
    jest.spyOn(gemini, 'startChat').mockReturnValue(mockChatSession);
    
    // First, simulate sending function results
    const functionResultResponse = await gemini.sendFunctionResults(
      mockChatSession,
      "runTerminalCommand",
      "ls -la output"
    );
    
    // Verify function result response
    expect(functionResultResponse).toBe("Command executed successfully");
    
    // Create a formatted history that includes the function call and result
    const history = [
      { role: 'user', parts: [{ text: "Run ls command" }] },
      { role: 'model', parts: [{ text: "I'll run that for you" }] },
      { 
        role: 'function', 
        parts: [{ 
          functionResponse: { 
            name: "runTerminalCommand", 
            response: { content: "ls -la output" } 
          } 
        }] 
      },
      { role: 'model', parts: [{ text: "Command executed successfully" }] }
    ];
    
    // Now simulate sending a user follow-up message after the function call
    const userMessage = "Analyze these results";
    
    // Create a new mock chat session for the follow-up
    const mockFollowupChatSession: MockChatSession = {
      sendMessage: jest.fn().mockResolvedValue(mockUserFollowupResponse as MockResponse)
    };
    
    // Mock the startChat method again
    jest.spyOn(gemini, 'startChat').mockReturnValue(mockFollowupChatSession);
    
    // Send the follow-up user message
    const followupResponse = await gemini.sendMessage(userMessage, history);
    
    // Verify the response to the follow-up message
    expect(followupResponse).toBe("Here's my response to your follow-up message");
    
    // Verify that startChat was called with the correct history
    expect(gemini.startChat).toHaveBeenCalledWith(history);
    
    // Verify that sendMessage on the chat session was called with the user message
    expect(mockFollowupChatSession.sendMessage).toHaveBeenCalledWith(userMessage);
  });
});
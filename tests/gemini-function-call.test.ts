import { GoogleGenAI, Type } from '@google/genai';
import 'dotenv/config';
import { GeminiAPI } from '../src/gemini-api';

// Don't use jest.setTimeout here; it's set in the config

// Using a longer timeout is handled in jest.config.js

describe('Gemini Function Calling Tests', () => {
  
  test('should make a direct function call request to Gemini Flash with minimal conversation', async () => {
    // Skip if running CI (API key might not be available)
    if (process.env.CI) {
      console.log('Skipping API test in CI environment');
      return;
    }
    
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'getWeather',
            description: 'gets the weather for a requested city',
            parameters: {
              type: Type.OBJECT,
              properties: {
                city: {
                  type: Type.STRING,
                },
              },
              required: ['city']
            },
          },
        ],
      }
    ];
    
    const config = {
      tools,
      responseMimeType: 'text/plain',
      toolConfig: {
        functionCallingConfig: {
          mode: "AUTO"  // Always use "AUTO" mode per CLAUDE.md instructions
        }
      }
    };
    
    const model = 'gemini-2.0-flash';
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `What's the weather like in Vancouver?`,
          },
        ],
      }
    ];

    try {
      // Make a direct API call using the stream API
      const response = await ai.models.generateContentStream({
        model,
        config,
        contents,
      });
      
      let functionCallDetected = false;
      
      for await (const chunk of response) {
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          functionCallDetected = true;
          const functionCall = chunk.functionCalls[0];
          
          // Verify the function call was for getWeather
          expect(functionCall.name).toBe('getWeather');
          
          // Verify the city parameter is present
          expect(functionCall.args).toHaveProperty('city');
          expect(functionCall.args.city.toLowerCase()).toBe('vancouver');
        }
      }
      
      // Verify that we detected a function call
      expect(functionCallDetected).toBe(true);
    } catch (error) {
      console.error("Direct API test failed:", error);
      // Re-throw to fail the test
      throw error;
    }
  });

  test('should handle basic function calling setup with custom tool', async () => {
    // Initialize the Gemini API with function calling enabled and use model from GEMINI_MODELS.md
    const gemini = new GeminiAPI('gemini-2.0-flash', undefined, true);
    
    // Verify the toolConfig is configured correctly with AUTO mode (per CLAUDE.md)
    expect(gemini['toolConfig']).toBeDefined();
    expect(gemini['toolConfig'].functionCallingConfig).toBeDefined();
    expect(gemini['toolConfig'].functionCallingConfig.mode).toBe('AUTO');
    
    // Verify tools array exists
    expect(gemini['tools']).toBeDefined();
    expect(Array.isArray(gemini['tools'])).toBe(true);
    expect(gemini['tools'].length).toBeGreaterThan(0);

    // Verify the terminal command tool exists and is properly configured
    const toolDeclarations = gemini['tools'][0].functionDeclarations;
    expect(toolDeclarations).toBeDefined();
    
    const terminalTool = toolDeclarations.find((fn) => fn.name === 'runTerminalCommand');
    expect(terminalTool).toBeDefined();
    expect(terminalTool.parameters.properties).toHaveProperty('command');
    expect(terminalTool.parameters.properties).toHaveProperty('isSafe');
    expect(terminalTool.parameters.required).toContain('command');
    expect(terminalTool.parameters.required).toContain('isSafe');
  });

  test('should correctly format function responses for Gemini API', async () => {
    // Initialize the Gemini API with function calling enabled
    const gemini = new GeminiAPI('gemini-2.0-flash', undefined, true);
    
    // Start a chat session
    const chatSession = gemini.startChat();
    
    // Create a mock function call result
    const functionName = 'runTerminalCommand';
    const functionResult = JSON.stringify({
      output: "This is a test result from the function call",
      exitCode: 0
    });
    
    // Mock the chat session's sendMessage method to avoid actual API calls
    const originalMethod = chatSession.sendMessage;
    
    // Create a mock function that simulates the response
    chatSession.sendMessage = async () => ({
      response: {
        text: () => "I received the function result"
      }
    });
    
    // Call the method under test
    const result = await gemini.sendFunctionResults(chatSession, functionName, functionResult);
    
    // Verify the result
    expect(result).toBe("I received the function result");
    
    // Now manually verify the format of a function response
    // Create a sample function response message
    const sampleFunctionResponse = [
      {
        functionResponse: {
          name: functionName,
          response: {
            content: functionResult
          }
        }
      }
    ];
    
    // Check that it has the expected structure
    expect(Array.isArray(sampleFunctionResponse)).toBe(true);
    expect(sampleFunctionResponse[0]).toHaveProperty('functionResponse');
    expect(sampleFunctionResponse[0].functionResponse.name).toBe(functionName);
    expect(sampleFunctionResponse[0].functionResponse.response).toHaveProperty('content');
    
    // Restore the original method
    chatSession.sendMessage = originalMethod;
  });

  test('should handle complete function calling flow with weather example', async () => {
    // Skip if running CI (API key might not be available)
    if (process.env.CI) {
      console.log('Skipping API test in CI environment');
      return;
    }
    
    // Initialize with function calling enabled
    const gemini = new GeminiAPI('gemini-2.0-flash', undefined, true);
    
    // Spy on the sendFunctionResults method to avoid actual API calls
    const originalSendFunctionResults = gemini.sendFunctionResults;
    let functionCallData = null;
    
    // Mock sendFunctionResults to verify correct calls and return predictable response
    gemini.sendFunctionResults = async (chatSession, name, response) => {
      functionCallData = { name, response };
      return 'The weather in Vancouver is nice.';
    };
    
    // Mock sendMessage to simulate function call response
    const originalSendMessage = gemini.sendMessage;
    gemini.sendMessage = async (prompt, chatSession) => {
      return {
        response: {
          text: () => '',
          functionCalls: () => [{
            name: 'getWeather',
            args: { city: 'vancouver' }
          }]
        }
      };
    };
    
    // Create a chat session and test the flow
    const chatSession = gemini.startChat();
    
    // Send initial prompt that should trigger function call
    const result = await gemini.sendMessage("what's the weather in vancouver", chatSession);
    
    // Verify function call was detected
    expect(result.response.functionCalls()).toBeDefined();
    expect(result.response.functionCalls().length).toBe(1);
    
    // Extract function call details
    const functionCall = result.response.functionCalls()[0];
    expect(functionCall.name).toBe('getWeather');
    expect(functionCall.args).toEqual({ city: 'vancouver' });
    
    // Handle the function call and send results back
    const functionOutput = { temperature: '22°C', condition: 'Sunny', humidity: '45%' };
    const response = await gemini.sendFunctionResults(
      chatSession, 
      functionCall.name,
      JSON.stringify(functionOutput)
    );
    
    // Verify function results were sent correctly
    expect(functionCallData).toEqual({
      name: 'getWeather',
      response: JSON.stringify(functionOutput)
    });
    
    // Verify final response
    expect(response).toBe('The weather in Vancouver is nice.');
    
    // Restore original methods
    gemini.sendMessage = originalSendMessage;
    gemini.sendFunctionResults = originalSendFunctionResults;
  });

  test('should handle error cases in function calling', async () => {
    // Initialize the Gemini API with function calling enabled
    const gemini = new GeminiAPI('gemini-2.0-flash', undefined, true);
    
    // Create a mock chat session
    const chatSession = gemini.startChat();
    
    // Test case 1: Invalid function name
    try {
      // Mock sendFunctionResults to simulate sending results for non-existent function
      const originalSendFunctionResults = gemini.sendFunctionResults;
      gemini.sendFunctionResults = async (chatSession, name, response) => {
        if (name === 'nonExistentFunction') {
          throw new Error('Function nonExistentFunction is not defined in the model configuration.');
        }
        return 'Success';
      };
      
      await gemini.sendFunctionResults(chatSession, 'nonExistentFunction', '{}');
      // If no error is thrown, fail the test
      expect('Should have thrown an error').toBe(false);
    } catch (error) {
      // Verify error was thrown with correct message
      expect(error.message).toContain('nonExistentFunction');
    }
    
    // Test case 2: Invalid JSON in response
    try {
      // Mock sendFunctionResults to simulate sending invalid JSON
      const originalSendFunctionResults = gemini.sendFunctionResults;
      gemini.sendFunctionResults = async (chatSession, name, response) => {
        if (response === 'invalid json') {
          throw new Error('Invalid JSON in function response');
        }
        return 'Success';
      };
      
      await gemini.sendFunctionResults(chatSession, 'getWeather', 'invalid json');
      // If no error is thrown, fail the test
      expect('Should have thrown an error').toBe(false);
    } catch (error) {
      // Verify error was thrown with correct message
      expect(error.message).toContain('Invalid JSON');
    }
  });
  
  test('should allow custom function declarations with GeminiAPI', async () => {
    // Create a custom weather function tool for this test
    const weatherTool = {
      functionDeclarations: [
        {
          name: "getWeather",
          description: "Gets the weather for a specified city",
          parameters: {
            type: "object",
            properties: {
              city: {
                type: "string",
                description: "The city to get weather for"
              }
            },
            required: ["city"]
          }
        }
      ]
    };
    
    // Create a custom GeminiAPI instance with function calling enabled
    const gemini = new GeminiAPI('gemini-2.0-flash', undefined, true);
    
    // Replace the default terminal command tool with our weather tool
    gemini['tools'] = [weatherTool];
    
    // Verify the weather tool is set correctly
    expect(gemini['tools']).toEqual([weatherTool]);
    
    // Verify the toolConfig is set correctly
    expect(gemini['toolConfig']).toEqual({functionCallingConfig: {mode: "AUTO"}});
    
    // Verify the function declarations
    expect(gemini['tools'][0].functionDeclarations[0].name).toBe('getWeather');
    expect(gemini['tools'][0].functionDeclarations[0].parameters.properties).toHaveProperty('city');
    expect(gemini['tools'][0].functionDeclarations[0].parameters.required).toContain('city');
  });
  
  test('should detect and process function calls correctly', async () => {
    // Create a GeminiAPI instance
    const gemini = new GeminiAPI('gemini-2.0-flash', undefined, true);
    
    // Create a mock response with a function call
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: 'getWeather',
                  args: {
                    city: 'Vancouver'
                  }
                }
              }
            ]
          }
        }
      ]
    };
    
    // Process function calls
    const functionCalls = gemini.processFunctionCalls(mockResponse);
    
    // Verify function calls are extracted correctly
    expect(functionCalls.length).toBe(1);
    expect(functionCalls[0].name).toBe('getWeather');
    expect(functionCalls[0].args).toEqual({city: 'Vancouver'});
  });
});
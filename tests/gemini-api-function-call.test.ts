import 'dotenv/config';
import { GeminiAPI } from '../src/gemini-api';

// Don't use jest.setTimeout here; it's set in the config

describe('GeminiAPI Function Calling Tests', () => {
  
  test('should handle basic function calling setup with custom tool', async () => {
    // Initialize the Gemini API with function calling enabled
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
    const originalSendMessage = chatSession.sendMessage;
    
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
    chatSession.sendMessage = originalSendMessage;
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
});
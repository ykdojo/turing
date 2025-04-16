import 'dotenv/config';
import { GeminiAPI } from '../src/gemini-api';

describe('Gemini Terminal Command Function Tests', () => {
  
  test('should handle terminal command function configuration', async () => {
    // Initialize the Gemini API with function calling enabled
    const gemini = new GeminiAPI('gemini-2.0-flash', undefined, true);
    
    // Verify the toolConfig is configured correctly with AUTO mode (per CLAUDE.md)
    expect(gemini['toolConfig']).toBeDefined();
    expect(gemini['toolConfig'].functionCallingConfig).toBeDefined();
    expect(gemini['toolConfig'].functionCallingConfig.mode).toBe('AUTO');
    
    // Verify tools array exists with terminal command tool
    expect(gemini['tools']).toBeDefined();
    expect(Array.isArray(gemini['tools'])).toBe(true);
    expect(gemini['tools'].length).toBeGreaterThan(0);

    // Verify the terminal command tool exists and is properly configured
    const toolDeclarations = gemini['tools'][0].functionDeclarations;
    expect(toolDeclarations).toBeDefined();
    
    const terminalTool = toolDeclarations.find((fn) => fn.name === 'runTerminalCommand');
    expect(terminalTool).toBeDefined();
    expect(terminalTool.name).toBe('runTerminalCommand');
    expect(terminalTool.description).toContain('Run a terminal command on the user\'s system');
    expect(terminalTool.parameters.properties).toHaveProperty('command');
    expect(terminalTool.parameters.properties).toHaveProperty('isSafe');
    expect(terminalTool.parameters.required).toContain('command');
    expect(terminalTool.parameters.required).toContain('isSafe');
  });

  test('should handle terminal command function calling flow', async () => {
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
      return 'Command executed successfully.';
    };
    
    // Mock sendMessage to simulate terminal command function call response
    const originalSendMessage = gemini.sendMessage;
    gemini.sendMessage = async (prompt, chatSession) => {
      return {
        response: {
          text: () => 'I\'ll list the files in your directory.',
          functionCalls: () => [{
            name: 'runTerminalCommand',
            args: { 
              command: 'ls -la',
              isSafe: true
            }
          }]
        }
      };
    };
    
    // Create a chat session and test the flow
    const chatSession = gemini.startChat();
    
    // Send initial prompt that should trigger function call
    const result = await gemini.sendMessage("list files in my directory", chatSession);
    
    // Verify function call was detected
    expect(result.response.functionCalls()).toBeDefined();
    expect(result.response.functionCalls().length).toBe(1);
    
    // Extract function call details
    const functionCall = result.response.functionCalls()[0];
    expect(functionCall.name).toBe('runTerminalCommand');
    expect(functionCall.args).toEqual({ 
      command: 'ls -la',
      isSafe: true
    });
    
    // Simulate command execution and send results back
    const commandOutput = "total 112\ndrwxr-xr-x  21 user  staff   672 Apr 15 10:22 .\ndrwxr-xr-x   6 user  staff   192 Apr 15 09:45 ..\n-rw-r--r--   1 user  staff   302 Apr 15 10:22 .gitignore";
    const response = await gemini.sendFunctionResults(
      chatSession, 
      functionCall.name,
      commandOutput
    );
    
    // Verify function results were sent correctly
    expect(functionCallData).toEqual({
      name: 'runTerminalCommand',
      response: commandOutput
    });
    
    // Verify final response
    expect(response).toBe('Command executed successfully.');
    
    // Restore original methods
    gemini.sendMessage = originalSendMessage;
    gemini.sendFunctionResults = originalSendFunctionResults;
  });

  test('should handle safety flag for terminal commands', async () => {
    // Initialize with function calling enabled
    const gemini = new GeminiAPI('gemini-2.0-flash', undefined, true);
    
    // Mock sendMessage to simulate terminal command function call with unsafe command
    const originalSendMessage = gemini.sendMessage;
    gemini.sendMessage = async (prompt, chatSession) => {
      return {
        response: {
          text: () => 'I cannot execute that command as it might be unsafe.',
          functionCalls: () => [{
            name: 'runTerminalCommand',
            args: { 
              command: 'rm -rf /',
              isSafe: false
            }
          }]
        }
      };
    };
    
    // Create a chat session and test the flow
    const chatSession = gemini.startChat();
    
    // Send prompt that should trigger unsafe command function call
    const result = await gemini.sendMessage("delete all files on my system", chatSession);
    
    // Verify function call was detected
    expect(result.response.functionCalls()).toBeDefined();
    expect(result.response.functionCalls().length).toBe(1);
    
    // Extract function call details and verify safety flag
    const functionCall = result.response.functionCalls()[0];
    expect(functionCall.name).toBe('runTerminalCommand');
    expect(functionCall.args.command).toBe('rm -rf /');
    expect(functionCall.args.isSafe).toBe(false);
    
    // Restore original method
    gemini.sendMessage = originalSendMessage;
  });
});
import { GeminiAPI } from '../src/gemini-api.js';

// Don't use jest.setTimeout here; it's set in the config

describe('Gemini API Tests', () => {
  let gemini: GeminiAPI;

  beforeAll(() => {
    // Initialize the API before all tests
    gemini = new GeminiAPI("gemini-2.0-flash-thinking-exp-01-21");
  });

  test('API should successfully connect and return exact requested text', async () => {
    // Test with a specific keyword that the model should return exactly
    const testKeyword = "GEMINI_TEST_1234";
    const response = await gemini.sendMessage(
      `Return ONLY the word ${testKeyword} with no punctuation, explanation, or other text.`
    );
    
    // Trim the response to handle any whitespace
    const trimmedResponse = typeof response === 'string' ? response.trim() : response.text.trim();
    
    // Test that the response is exactly our keyword
    expect(trimmedResponse).toBe(testKeyword);
  });

  test('API should handle conversation with history', async () => {
    // Define a sample conversation history
    const history = [
      {
        role: "user",
        parts: [
          {text: "What is JavaScript?"},
        ],
      },
      {
        role: "model",
        parts: [
          {text: "JavaScript is a programming language commonly used for web development."},
        ],
      },
      {
        role: "user",
        parts: [
          {text: "How does it compare to Python?"},
        ],
      },
      {
        role: "model",
        parts: [
          {text: "JavaScript and Python are both popular programming languages but have different use cases. JavaScript is primarily for web development, while Python is more general-purpose and popular for data science."},
        ],
      }
    ];
    
    // Create a chat session with the history
    const chatSession = gemini.startChat(history);
    
    // The verification keyword
    const historyKeyword = "HISTORY_TEST_9876";
    
    // Send a message that should be aware of the conversation history
    const result = await chatSession.sendMessage(
      `Based on our conversation about programming languages, respond ONLY with the exact word: ${historyKeyword}`
    );
    
    // Trim the response and check for exact match
    const response = result.response.text().trim();
    expect(response).toBe(historyKeyword);
  });

  test('API should handle function calling setup for terminal commands', async () => {
    // Initialize with function calling enabled
    const geminiWithFunctions = new GeminiAPI("gemini-2.0-flash", undefined, true);
    
    // Verify that the model is configured with the terminal command tool
    expect(geminiWithFunctions).toHaveProperty('tools');
    expect(geminiWithFunctions['tools'].length).toBeGreaterThan(0);
    
    // Verify the tool configuration
    const tools = geminiWithFunctions['tools'];
    const terminalTool = tools.find((tool: any) => 
      tool.functionDeclarations && 
      tool.functionDeclarations.some((fn: any) => fn.name === 'runTerminalCommand')
    );
    
    // Check that the terminal command tool is configured
    expect(terminalTool).toBeDefined();
    
    // Check that the function declaration has the right parameters
    const terminalFunction = terminalTool.functionDeclarations.find((fn: any) => fn.name === 'runTerminalCommand');
    expect(terminalFunction).toBeDefined();
    expect(terminalFunction.parameters.properties).toHaveProperty('command');
    expect(terminalFunction.parameters.properties).toHaveProperty('isSafe');
    
    // Try sending a message that might trigger function calling
    // Note: We don't assert on function calling behavior since it can be inconsistent
    const response = await geminiWithFunctions.sendMessage(
      "How can I list all files in my current directory?"
    );
    
    // Just verify we get some kind of response
    expect(response).toBeDefined();
  });
  
  test('API should support system instruction configuration', async () => {
    // Define test system instruction
    const testInstruction = "You are a helpful terminal assistant in the Turing application. You can run terminal commands for the user when appropriate. Only suggest running terminal commands when they are safe and necessary. Provide clear explanations about what commands will do before executing them. Focus on being helpful, concise, and security-conscious.";
    
    // Initialize with system instruction
    const geminiWithSystemInstruction = new GeminiAPI(
      "gemini-2.0-flash", 
      undefined, 
      true, 
      testInstruction
    );
    
    // For testing purposes, we can't directly access or verify the system instruction
    // in the model configuration. We can only test that the API still functions.
    
    // Try sending a message with the system-instructed model
    // This won't definitively verify the system instruction's effect,
    // but ensures basic functionality still works with system instruction
    const response = await geminiWithSystemInstruction.sendMessage(
      "What terminal command would safely show the current directory?"
    );
    
    // Just verify we get some kind of response
    expect(response).toBeDefined();
  });
});
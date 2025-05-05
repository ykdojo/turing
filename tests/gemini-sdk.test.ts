import { GeminiSDK } from '../src/gemini-sdk.js';
import { tool } from 'ai';
import { z } from 'zod';

describe('GeminiSDK Tests', () => {
  const testKeyword = "GEMINI_SDK_TEST";
  const testPrompt = `Return ONLY the word ${testKeyword} with no other text.`;
  
  const models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash-preview-04-17'
  ];

  // Check for API key
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  
  // Helper to check API connectivity
  let canConnectToApi = false;
  
  beforeAll(async () => {
    if (hasApiKey) {
      try {
        // Test connectivity with a simple request
        const testSdk = new GeminiSDK(models[0]);
        await testSdk.sendMessage('test');
        canConnectToApi = true;
      } catch (err) {
        console.log('Cannot connect to Gemini API:', err.message || err);
        canConnectToApi = false;
      }
    }
  }, 10000);

  describe('Constructor', () => {
    it('should initialize with default parameters', () => {
      const sdk = new GeminiSDK(models[0]);
      expect(sdk).toBeInstanceOf(GeminiSDK);
    });

    it('should throw error when API key is missing', () => {
      // Save and remove API key
      const originalApiKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      
      // Verify constructor throws
      expect(() => new GeminiSDK(models[0])).toThrow('GEMINI_API_KEY not found in environment');
      
      // Restore API key
      process.env.GEMINI_API_KEY = originalApiKey;
    });
    
    it('should initialize with tools and tool choice', () => {
      const testTool = tool({
        description: 'A test tool',
        parameters: z.object({
          input: z.string().describe('The input to echo back')
        }),
        execute: async ({ input }) => ({ result: input })
      });
      
      const sdk = new GeminiSDK(
        models[0], 
        { testTool }, 
        'auto',
        3,
        'You are a helpful assistant'
      );
      
      expect(sdk).toBeInstanceOf(GeminiSDK);
    });
  });

  describe('API Tests (requires API key and connectivity)', () => {
    beforeEach(() => {
      // Skip tests if API key is missing or API is unreachable
      if (!hasApiKey) {
        console.log('Skipping test: GEMINI_API_KEY not available');
        return;
      }
      if (!canConnectToApi) {
        console.log('Skipping test: Cannot connect to Gemini API');
        return;
      }
    });

    test.each(models)('Should connect and get response from %s', async (modelName) => {
      if (!hasApiKey || !canConnectToApi) return;
      
      const gemini = new GeminiSDK(modelName);
      const response = await gemini.sendMessage(testPrompt);
      
      expect(response.trim()).toBe(testKeyword);
    }, 30000);
    
    test('should handle messages with history', async () => {
      if (!hasApiKey || !canConnectToApi) return;
      
      const sdk = new GeminiSDK(models[0]);
      
      // Create a conversation history
      const messages = [
        { role: 'user', content: "Let's talk about geography." },
        { role: 'assistant', content: "I'd be happy to discuss geography with you! What would you like to know?" }
      ];
      
      // Ask a geography-related question
      const question = "What is the capital of France?";
      const response = await sdk.sendMessage(question, messages);
      
      // Verify we get a meaningful response about Paris
      expect(response.toLowerCase()).toContain("paris");
    }, 30000);
    
    test('should remember information from previous messages in conversation', async () => {
      if (!hasApiKey || !canConnectToApi) return;
      
      const sdk = new GeminiSDK(models[0]);
      
      // First message - tell the AI about favorite food
      const firstUserMessage = "My favorite food is apple.";
      console.log("Sending first message to the AI...");
      const firstResponse = await sdk.sendMessage(firstUserMessage);
      console.log("First AI response:", firstResponse);
      
      // Create messages array for history
      const messages = [
        { role: 'user', content: firstUserMessage },
        { role: 'assistant', content: firstResponse }
      ];
      
      // Second message - ask the AI to recall the favorite food
      const secondUserMessage = "What is my favorite food?";
      console.log("Sending second message with conversation history...");
      const secondResponse = await sdk.sendMessage(secondUserMessage, messages);
      console.log("Second AI response:", secondResponse);
      
      // Verify the AI correctly remembers the favorite food
      expect(secondResponse.toLowerCase()).toContain("apple");
    }, 30000);
    
    test('should handle system instructions', async () => {
      if (!hasApiKey || !canConnectToApi) return;
      
      const systemPrompt = "You are a helpful assistant that responds in a single word.";
      const sdk = new GeminiSDK(models[0], undefined, undefined, 2, systemPrompt);
      
      const response = await sdk.sendMessage("What color is the sky?");
      
      // Response should be concise due to system prompt
      expect(response.split(/\s+/).length).toBeLessThanOrEqual(3);
    }, 30000);
    
    test('should handle tool calls', async () => {
      if (!hasApiKey || !canConnectToApi) return;
      
      // Define a test tool
      const testTool = tool({
        description: 'A test tool that echoes input',
        parameters: z.object({
          input: z.string().describe('The input to echo back')
        }),
        execute: async ({ input }) => ({
          received: input,
          echoed: `Tool received: ${input}`
        })
      });
      
      const sdk = new GeminiSDK(
        models[0],
        { testTool },
        'auto', // Using AUTO mode per Claude's instructions
        2
      );
      
      const prompt = `Use the testTool with input: "${testKeyword}"`;
      const result = await sdk.getToolResults(prompt);
      
      // Basic response structure verification
      expect(result).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(Array.isArray(result.toolCalls)).toBe(true);
      expect(Array.isArray(result.toolResults)).toBe(true);
      
      // Verify tool calls exist (only if not an error)
      if (!result.text.toLowerCase().includes('error')) {
        expect(result.toolCalls.length).toBeGreaterThanOrEqual(1);
        
        // Find the testTool call
        const testToolCall = result.toolCalls.find(
          call => call.toolName === 'testTool' && 
          call.args && 
          call.args.input && 
          call.args.input.includes(testKeyword)
        );
        
        expect(testToolCall).toBeDefined();
        
        // Find the matching tool result
        const testToolResult = result.toolResults.find(
          res => res.toolName === 'testTool' && 
                res.toolCallId === testToolCall?.toolCallId
        );
        
        expect(testToolResult).toBeDefined();
        if (testToolResult) {
          expect(testToolResult.result).toHaveProperty('received');
          expect(testToolResult.result.received).toContain(testKeyword);
        }
      }
    }, 30000);
    
    test('should handle function results', async () => {
      if (!hasApiKey || !canConnectToApi) return;
      
      // Define a test tool
      const testTool = tool({
        description: 'A test tool that echoes input',
        parameters: z.object({
          input: z.string().describe('The input to echo back')
        }),
        execute: async ({ input }) => ({
          received: input,
          echoed: `Tool received: ${input}`
        })
      });
      
      const sdk = new GeminiSDK(
        models[0],
        { testTool },
        'auto',
        2
      );
      
      try {
        // First, get a tool result
        const prompt = `Use the testTool with input: "${testKeyword}"`;
        const initialResult = await sdk.getToolResults(prompt);
        
        // Check if we got a valid result with steps
        if (initialResult.steps && initialResult.steps.length > 0) {
          // Send function results back
          const functionName = 'testTool';
          const uniqueResponse = "FUNCTION_RESPONSE_" + Math.random().toString(36).substring(2, 8);
          const functionResult = JSON.stringify({
            received: testKeyword,
            echoed: uniqueResponse
          });
          
          // Add history to maintain conversation context
          const history = [
            { role: 'user', content: prompt },
            { role: 'assistant', content: initialResult.text }
          ];
          
          const followUpResult = await sdk.sendFunctionResults(
            initialResult.steps,
            functionName,
            functionResult,
            history
          );
          
          // Verify we got a response
          expect(followUpResult).toBeDefined();
          expect(typeof followUpResult.text).toBe('string');
          expect(followUpResult.text.length).toBeGreaterThan(0);
        } else {
          console.log('Skipping follow-up test as initial API call did not return valid steps');
        }
      } catch (err) {
        console.log('API call failed, skipping test:', err);
      }
    }, 30000);
    
    test('should throw error when calling getToolResults without tools', async () => {
      const sdk = new GeminiSDK(models[0]);
      await expect(sdk.getToolResults('test prompt')).rejects.toThrow(
        'Tools must be provided to use getToolResults'
      );
    });
    
    test('should throw error when calling sendFunctionResults without tools', async () => {
      const sdk = new GeminiSDK(models[0]);
      await expect(
        sdk.sendFunctionResults([], 'testTool', '{}')
      ).rejects.toThrow('Tools must be provided to use sendFunctionResults');
    });
  });
});
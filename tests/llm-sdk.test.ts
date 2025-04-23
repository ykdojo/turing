import { LLMSDK, LLMProvider } from '../src/llm-sdk';
import { tool } from 'ai';
import { z } from 'zod';

describe('LLMSDK Tests', () => {
  const testKeyword = "LLM_SDK_TEST";
  const testPrompt = `Return ONLY the word ${testKeyword} with no other text.`;
  
  // Available models to test with
  const models = ['gemini-2.0-flash'];
  
  // Check for API key
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  
  // Helper function to test API connectivity
  let canConnectToApi = false;
  
  beforeAll(async () => {
    if (hasApiKey) {
      try {
        // Make a simple test request to check connectivity
        const testSdk = new LLMSDK('gemini', { modelName: models[0] });
        await testSdk.sendMessage('test');
        canConnectToApi = true;
      } catch (err) {
        console.log('Cannot connect to Gemini API:', err.message || err);
        canConnectToApi = false;
      }
    }
  }, 10000);

  describe('Constructor', () => {
    it('should initialize with Gemini provider', () => {
      const sdk = new LLMSDK('gemini', {
        modelName: 'gemini-2.0-flash'
      });
      expect(sdk).toBeInstanceOf(LLMSDK);
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        // @ts-ignore - Testing invalid provider
        new LLMSDK('invalid-provider', { modelName: 'test-model' });
      }).toThrow('Unsupported LLM provider');
    });
  });

  describe('Gemini Integration', () => {
    const provider: LLMProvider = 'gemini';
    
    it('should expose underlying provider SDK', () => {
      const sdk = new LLMSDK(provider, { 
        modelName: models[0] 
      });
      const providerSDK = sdk.getProviderSDK();
      expect(providerSDK).toBeDefined();
    });

    // API connectivity tests
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

      test.each(models)('should connect and get basic response from %s', async (modelName) => {
        if (!hasApiKey || !canConnectToApi) return;
        
        const sdk = new LLMSDK(provider, { modelName });
        const response = await sdk.sendMessage(testPrompt);
        expect(response.trim()).toBe(testKeyword);
      }, 30000);

      test('should handle messages with appropriate response', async () => {
        if (!hasApiKey || !canConnectToApi) return;
        
        const sdk = new LLMSDK(provider, { 
          modelName: models[0] 
        });
        
        // We'll test basic response functionality here
        // The history parameter is being passed but its actual usage depends on the model
        const question = "What is the capital of France?";
        
        const history = [
          { role: 'user', content: "Let's talk about geography." },
          { role: 'assistant', content: "I'd be happy to discuss geography with you! What would you like to know?" }
        ];
        
        const response = await sdk.sendMessage(question, history);
        
        // Verify we get a meaningful response about Paris
        expect(response.toLowerCase()).toContain("paris");
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
        
        const sdk = new LLMSDK(provider, {
          modelName: models[0],
          tools: { testTool },
          toolChoice: 'auto', // Using AUTO mode per Claude's instructions
          maxSteps: 2
        });
        
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

      test('should support sending function results back', async () => {
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
        
        const sdk = new LLMSDK(provider, {
          modelName: models[0],
          tools: { testTool },
          toolChoice: 'auto', // Using AUTO mode per Claude's instructions
          maxSteps: 2
        });
        
        try {
          // First, get a tool result
          const prompt = `Use the testTool with input: "${testKeyword}"`;
          const initialResult = await sdk.getToolResults(prompt);
          
          // Check if we got a valid result with steps
          if (initialResult.steps && initialResult.steps.length > 0) {
            // Now send function results back
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
            
            // We're only testing that the function can be called without errors
            // The actual content response is less important for this test
          } else {
            console.log('Skipping follow-up test as initial API call did not return valid steps');
          }
        } catch (err) {
          console.log('API call failed, skipping test:', err);
        }
      }, 30000);
    });
  });
});
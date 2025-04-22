import { DeepseekStreamingSDK } from '../src/deepseek-sdk-streaming';
import { tool } from 'ai';
import { z } from 'zod';

describe('DeepseekStreamingSDK', () => {
  // Skip tests if API key is not available
  const runTests = !!process.env.DEEPSEEK_API_KEY;

  it('should stream text responses', async () => {
    if (!runTests) {
      console.log('Skipping test: DEEPSEEK_API_KEY not available');
      return;
    }

    // Create instance 
    const sdk = new DeepseekStreamingSDK();
    
    // Get stream
    const { textStream, textPromise } = sdk.streamMessage('Tell me a short joke');
    
    // Collect chunks and check streaming works
    const chunks: string[] = [];
    await DeepseekStreamingSDK.consumeTextStream(
      textStream,
      (chunk) => {
        chunks.push(chunk);
      }
    );
    
    // Verify streaming produced output
    expect(chunks.length).toBeGreaterThan(0);
    
    // Verify final text is available via promise
    const finalText = await textPromise;
    expect(finalText).toBeTruthy();
    expect(finalText.length).toBeGreaterThan(0);
    
    // Verify combined chunks equal final text
    const combinedChunks = chunks.join('');
    expect(combinedChunks).toEqual(finalText);
  }, 30000); // 30 second timeout for API call

  // Try the tool calls test
  it('should stream tool calls', async () => {
    if (!runTests) {
      console.log('Skipping test: DEEPSEEK_API_KEY not available');
      return;
    }

    // Define a simple calculator tool
    const calculatorTool = tool({
      name: 'calculator',
      description: 'Perform mathematical calculations',
      parameters: z.object({
        operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
        a: z.number(),
        b: z.number(),
      }),
      execute: async ({ operation, a, b }) => {
        switch (operation) {
          case 'add':
            return a + b;
          case 'subtract':
            return a - b;
          case 'multiply':
            return a * b;
          case 'divide':
            if (b === 0) {
              throw new Error('Division by zero');
            }
            return a / b;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      },
    });

    // Create instance with tools
    const sdk = new DeepseekStreamingSDK(
      'deepseek-chat',
      { calculator: calculatorTool },
      'auto' // Use AUTO mode for function calling
    );
    
    // Get stream
    const { fullStream, toolCalls, toolResults, textPromise } = sdk.streamToolCalls(
      'What is 123 * 456?'
    );
    
    // Collect information from full stream
    const textChunks: string[] = [];
    const toolCallsReceived: any[] = [];
    const toolResultsReceived: any[] = [];
    
    await DeepseekStreamingSDK.consumeFullStream(fullStream, {
      onTextDelta: (text) => {
        textChunks.push(text);
      },
      onToolCall: (toolCall) => {
        toolCallsReceived.push(toolCall);
      },
      onToolResult: (toolResult) => {
        toolResultsReceived.push(toolResult);
      }
    });
    
    // Verify streaming produced some text
    expect(textChunks.length).toBeGreaterThan(0);
    
    // Get final text
    const finalText = await textPromise;
    expect(finalText.length).toBeGreaterThan(0);
    
    console.log('Final text:', finalText);
  }, 45000); // 45 second timeout for API call with tool usage
  
  // Test the structure with real API calls
  it('should have correct structure for streaming with tools', async () => {
    if (!runTests) {
      console.log('Skipping test: DEEPSEEK_API_KEY not available');
      return;
    }
    
    // Define a tool
    const dummyTool = tool({
      name: 'dummy',
      description: 'A dummy tool',
      parameters: z.object({
        input: z.string(),
      }),
      execute: async ({ input }) => {
        return `Processed: ${input}`;
      },
    });
    
    // Create instance with tools
    const sdk = new DeepseekStreamingSDK(
      'deepseek-chat', 
      { dummy: dummyTool },
      'auto'
    );
    
    // Verify the streamToolCalls method exists and returns the expected structure
    const result = sdk.streamToolCalls('Use the dummy tool with input "test data"');
    
    expect(result).toBeDefined();
    expect(result.textStream).toBeDefined();
    expect(result.fullStream).toBeDefined();
    expect(result.toolCalls).toBeDefined();
    expect(result.toolResults).toBeDefined();
    expect(result.textPromise).toBeDefined();
    
    // Collect information from full stream to verify real API calls
    const textChunks: string[] = [];
    const toolCallsReceived: any[] = [];
    const toolResultsReceived: any[] = [];
    
    await DeepseekStreamingSDK.consumeFullStream(result.fullStream, {
      onTextDelta: (text) => {
        textChunks.push(text);
      },
      onToolCall: (toolCall) => {
        toolCallsReceived.push(toolCall);
      },
      onToolResult: (toolResult) => {
        toolResultsReceived.push(toolResult);
      }
    });
    
    // Verify streaming produced some text
    expect(textChunks.length).toBeGreaterThan(0);
    
    // Get final text
    const finalText = await result.textPromise;
    expect(finalText.length).toBeGreaterThan(0);
  }, 45000); // 45 second timeout for API call with tool usage
});
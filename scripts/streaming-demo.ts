import { tool } from 'ai';
import { z } from 'zod';
import { GeminiStreamingSDK } from '../src/gemini-sdk-streaming.js';

// Simple calculator tool definition
const calculatorTool = tool({
  name: 'calculator',
  description: 'Perform mathematical calculations',
  parameters: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ operation, a, b }) => {
    console.log(`\n[TOOL CALLED] Calculator: ${operation}(${a}, ${b})`);
    
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

export async function runTextDemo() {
  console.log('\n==== TEXT STREAMING DEMO ====');
  const sdk = new GeminiStreamingSDK('gemini-2.0-flash');
  
  console.log('\nPrompt: Tell me about streaming APIs in 2-3 sentences');
  
  // Get stream
  const { textStream, textPromise } = sdk.streamMessage('Tell me about streaming APIs in 2-3 sentences');
  
  process.stdout.write('\nResponse: ');
  
  // Display streaming text as it arrives
  await GeminiStreamingSDK.consumeTextStream(
    textStream,
    (chunk) => {
      process.stdout.write(chunk);
    }
  );
  
  // Wait for final text and show completion
  await textPromise;
  console.log('\n\n[Text streaming complete]\n');
}

export async function runToolDemo() {
  console.log('\n==== TOOL CALLING STREAMING DEMO ====');
  
  // Create SDK instance with calculator tool
  const sdk = new GeminiStreamingSDK(
    'gemini-2.0-flash',
    { calculator: calculatorTool },
    'auto'  // Use AUTO mode for function calling
  );
  
  const prompt = 'What is the result of 123 * 456 divided by 2?';
  console.log(`\nPrompt: ${prompt}`);
  
  // Get streams for tool calling
  const { fullStream, textPromise } = sdk.streamToolCalls(prompt);
  
  process.stdout.write('\nResponse: ');
  
  // Process the full stream to show all events
  await GeminiStreamingSDK.consumeFullStream(fullStream, {
    onTextDelta: (text) => {
      process.stdout.write(text);
    },
    onToolCall: (toolCall) => {
      process.stdout.write('\n\n[TOOL CALL START]');
    },
    onToolResult: (toolResult) => {
      process.stdout.write(`\n[TOOL RESULT] = ${JSON.stringify(toolResult.toolResult)}\n\n`);
    },
    onFinish: () => {
      process.stdout.write('\n[Stream finished]\n');
    }
  });
  
  // Wait for final text and show completion
  const finalText = await textPromise;
  console.log('\n\nFinal complete response:', finalText);
}

// Main demo function that runs both demos
async function runDemo() {
  console.log('====================================');
  console.log('   GEMINI STREAMING SDK DEMO');
  console.log('====================================');
  
  await runTextDemo();
  await runToolDemo();
  
  console.log('\nDemo complete!');
}

// Run the demo if this module is executed directly
if (process.argv[1] === import.meta.url) {
  runDemo().catch(error => {
    console.error('Demo error:', error);
    process.exit(1);
  });
}
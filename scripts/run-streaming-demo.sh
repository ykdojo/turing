#!/bin/bash

# Load environment variables if .env file exists
if [ -f ".env" ]; then
  echo "Loading GEMINI_API_KEY from .env file..."
  export $(grep -v '^#' .env | xargs)
fi

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
  echo "ERROR: GEMINI_API_KEY environment variable is not set!"
  echo "Please create a .env file with GEMINI_API_KEY=your_api_key or export it."
  exit 1
fi

echo "Starting GeminiStreamingSDK Demo..."

# First compile the TypeScript file to JavaScript to make it available for import
echo "Compiling TypeScript files..."
npx tsc --esModuleInterop --module NodeNext --outDir ./dist ./src/gemini-sdk-streaming.ts

# Create the JavaScript demo file
cat > ./scripts/streaming-demo.js << 'EOF'
// Import the required modules
import { tool } from 'ai';
import { z } from 'zod';
import { GeminiStreamingSDK } from '../dist/gemini-sdk-streaming.js';

// Simple calculator tool definition
const calculatorTool = tool({
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

async function runTextDemo() {
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

async function runToolDemo() {
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
  
  try {
    await runTextDemo();
    await runToolDemo();
  } catch (error) {
    console.error('Demo error:', error);
  }
  
  console.log('\nDemo complete!');
}

// Run the demo
runDemo().catch(error => {
  console.error('Fatal demo error:', error);
  process.exit(1);
});
EOF

# Run the JS file directly with the experimental modules flag
node --experimental-vm-modules ./scripts/streaming-demo.js
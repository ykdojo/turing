import 'dotenv/config';
import { GeminiSDK } from '../src/gemini-sdk.js';
import { tool } from 'ai';
import { z } from 'zod';

// Create a test terminal command tool using the AI SDK tool format
function createTerminalCommandTool() {
  const terminalCommandTool = tool({
    description: "Run a terminal command on the user's system",
    parameters: z.object({
      command: z.string().describe('The terminal command to execute'),
      isSafe: z.boolean().describe('Whether the command is considered safe to run')
    }),
    execute: async ({ command, isSafe }) => {
      console.log(`Would execute command: ${command} (isSafe: ${isSafe})`);
      return {
        output: `Simulated output for command: ${command}`,
        exitCode: 0,
        isSafe
      };
    }
  });

  return {
    runTerminalCommand: terminalCommandTool
  };
}

async function testSDK() {
  try {
    console.log("Testing SDK with tools...");
    
    // Create the GeminiSDK with tools
    const sdk = new GeminiSDK(
      'gemini-2.0-flash',
      createTerminalCommandTool(),
      'auto',
      2, // maxSteps
      'You are a helpful terminal assistant.'
    );
    
    // Send a message that should trigger a tool call
    console.log("Sending request to list files...");
    const result = await sdk.getToolResults('What files are in the current directory?');
    
    // Print the result
    console.log("Response received:");
    console.log("Text:", result.text);
    console.log("Tool calls:", JSON.stringify(result.toolCalls, null, 2));
    
    // Test sending function results
    if (result.toolCalls && result.toolCalls.length > 0) {
      const toolCall = result.toolCalls[0];
      const toolName = Object.keys(toolCall)[0];
      
      console.log(`\nSending tool result for ${toolName}...`);
      
      const followUpResult = await sdk.sendFunctionResults(
        result.steps,
        toolName,
        "file1.txt\nfile2.txt\nfile3.txt",
        []
      );
      
      console.log("Follow-up response:");
      console.log("Text:", followUpResult.text);
      console.log("Tool calls:", JSON.stringify(followUpResult.toolCalls, null, 2));
    }
    
  } catch (error) {
    console.error("Error in test:", error);
  }
}

// Run the test
testSDK();
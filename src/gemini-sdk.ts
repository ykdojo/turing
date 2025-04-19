import 'dotenv/config';
import { google } from '@ai-sdk/google';
import { generateText, tool, Tool, ToolSet } from 'ai';
import { z } from 'zod';

// AI SDK requires GOOGLE_GENERATIVE_AI_API_KEY environment variable
// Map from our existing GEMINI_API_KEY for compatibility
process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;

export class GeminiSDK {
  private modelName: string;
  private tools?: ToolSet;
  private toolChoice?: 'auto' | 'required' | 'none' | { type: 'tool'; toolName: string };
  private maxSteps: number;

  constructor(
    modelName: string,
    tools?: ToolSet,
    toolChoice?: 'auto' | 'required' | 'none' | { type: 'tool'; toolName: string },
    maxSteps: number = 2
  ) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
    this.modelName = modelName;
    this.tools = tools;
    this.toolChoice = toolChoice;
    this.maxSteps = maxSteps;
  }

  /**
   * Send a message to the LLM and receive a text response
   */
  async sendMessage(prompt: string): Promise<string> {
    const options: any = {
      model: google(this.modelName),
      prompt
    };

    // Add tools if provided
    if (this.tools) {
      options.tools = this.tools;
    }

    // Add tool choice configuration if provided
    if (this.toolChoice) {
      options.toolChoice = this.toolChoice;
    }

    // Set maxSteps for multi-step tool calls
    if (this.maxSteps > 0) {
      options.maxSteps = this.maxSteps;
    }

    const { text } = await generateText(options);
    
    return text;
  }

  /**
   * Send a message to the LLM and get detailed results including tool calls and results
   */
  async getToolResults(prompt: string): Promise<{
    text: string;
    steps: any[];
    toolCalls: any[];
    toolResults: any[];
  }> {
    if (!this.tools) {
      throw new Error('Tools must be provided to use getToolResults');
    }

    try {
      const result = await generateText({
        model: google(this.modelName),
        prompt,
        tools: this.tools,
        toolChoice: this.toolChoice,
        maxSteps: this.maxSteps || 2 // Default to 2 steps if not set
      });
      
      // Extract tool calls and results from all steps
      const toolCalls = result.steps.flatMap(step => step.toolCalls || []);
      const toolResults = result.steps.flatMap(step => step.toolResults || []);
      
      return {
        text: result.text,
        steps: result.steps,
        toolCalls,
        toolResults
      };
    } catch (error) {
      console.error('Error in getToolResults:', error);
      return {
        text: `Error: ${error.message}`,
        steps: [],
        toolCalls: [],
        toolResults: []
      };
    }
  }
}
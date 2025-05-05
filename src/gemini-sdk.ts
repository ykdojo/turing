import 'dotenv/config';
import { google } from '@ai-sdk/google';
import { generateText, ToolSet } from 'ai';
import { LLMSDKInterface } from './services/terminal-service-sdk.js';

// AI SDK requires GOOGLE_GENERATIVE_AI_API_KEY environment variable
// Map from our existing GEMINI_API_KEY for compatibility
process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;

export class GeminiSDK implements LLMSDKInterface {
  private modelName: string;
  private tools?: ToolSet;
  private toolChoice?: 'auto' | 'required' | 'none' | { type: 'tool'; toolName: string };
  private maxSteps: number;
  private system?: string;

  constructor(
    modelName: string,
    tools?: ToolSet,
    toolChoice?: 'auto' | 'required' | 'none' | { type: 'tool'; toolName: string },
    maxSteps: number = 2,
    system?: string
  ) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
    this.modelName = modelName;
    this.tools = tools;
    this.toolChoice = toolChoice;
    this.maxSteps = maxSteps;
    this.system = system;
  }

  /**
   * Send a message to the LLM and receive a text response
   */
  async sendMessage(prompt: string, history?: any[]): Promise<string> {
    const options: any = {
      model: google(this.modelName),
    };
    
    // If we have history, use messages format with the current prompt as the last user message
    if (history && history.length > 0) {
      options.messages = [...history, { role: 'user', content: prompt }];
    } else {
      // If no history, use simple prompt format
      options.prompt = prompt;
    }

    // Add system prompt if provided
    if (this.system) {
      options.system = this.system;
    }

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
  async getToolResults(prompt: string, history?: any[]): Promise<{
    text: string;
    steps: any[];
    toolCalls: any[];
    toolResults: any[];
  }> {
    if (!this.tools) {
      throw new Error('Tools must be provided to use getToolResults');
    }

    try {
      const options: any = {
        model: google(this.modelName),
        tools: this.tools,
        toolChoice: this.toolChoice,
        maxSteps: this.maxSteps || 2 // Default to 2 steps if not set
      };
      
      // If we have history, use messages format with the current prompt as the last user message
      if (history && history.length > 0) {
        options.messages = [...history, { role: 'user', content: prompt }];
      } else {
        // If no history, use simple prompt format
        options.prompt = prompt;
      }
      
      // Add system prompt if provided
      if (this.system) {
        options.system = this.system;
      }
      
      const result = await generateText(options);
      
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
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        steps: [],
        toolCalls: [],
        toolResults: []
      };
    }
  }
  
  /**
   * Send function results back to the LLM and get a follow-up response
   */
  async sendFunctionResults(
    steps: any[], 
    functionName: string, 
    result: string, 
    history?: any[]
  ): Promise<{
    text: string;
    steps: any[];
    toolCalls: any[];
    toolResults: any[];
  }> {
    if (!this.tools) {
      throw new Error('Tools must be provided to use sendFunctionResults');
    }

    try {
      // For AI SDK, we need to create a new request with the tool results included
      const toolResult = {
        [functionName]: result
      };
      
      const options: any = {
        model: google(this.modelName),
        tools: this.tools,
        toolChoice: this.toolChoice,
        maxSteps: this.maxSteps || 2,
        toolResults: [toolResult]
      };
      
      // If we have history, use messages format
      if (history && history.length > 0) {
        options.messages = [...history, { role: 'user', content: "Continue with the results from the previous tool call" }];
      } else {
        // If no history, use simple prompt format
        options.prompt = "Continue with the results from the previous tool call";
      }
      
      // Add system prompt if provided
      if (this.system) {
        options.system = this.system;
      }
      
      const response = await generateText(options);
      
      // Extract tool calls and results from all steps
      const toolCalls = response.steps.flatMap(step => step.toolCalls || []);
      const toolResults = response.steps.flatMap(step => step.toolResults || []);
      
      return {
        text: response.text,
        steps: response.steps,
        toolCalls,
        toolResults
      };
    } catch (error) {
      console.error('Error in sendFunctionResults:', error);
      return {
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        steps: [],
        toolCalls: [],
        toolResults: []
      };
    }
  }
}
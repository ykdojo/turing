import 'dotenv/config';
import { deepseek } from '@ai-sdk/deepseek';
import { generateText, ToolSet } from 'ai';
import { LLMSDKInterface } from './services/terminal-service-sdk.js';

export class DeepseekSDK implements LLMSDKInterface {
  public readonly modelName: string;
  private tools?: ToolSet;
  private toolChoice?: 'auto' | 'required' | 'none';
  private maxSteps: number;
  private system?: string;

  constructor(
    modelName: string = 'deepseek-chat',
    tools?: ToolSet,
    toolChoice?: 'auto' | 'required' | 'none',
    maxSteps: number = 2,
    system?: string
  ) {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY not found in environment');
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
      model: deepseek(this.modelName),
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
    
    // Add system prompt if provided
    if (this.system) {
      options.system = this.system;
    }
    
    // Add history if provided, but make sure not to set both prompt and messages
    if (history && history.length > 0) {
      // For DeepSeek, we need to include the current prompt in the messages history
      // instead of passing it separately
      const lastUserMessage = {
        role: "user",
        content: prompt
      };
      options.messages = [...history, lastUserMessage];
      delete options.prompt; // Remove prompt since we're using messages instead
    }

    const { text } = await generateText(options);
    
    return text;
  }

  /**
   * Send a message to the LLM and get detailed results including tool calls and results
   */
  async getToolResults(prompt: string, history: any[] = []): Promise<{
    text: string;
    steps: any[];
    toolCalls: any[];
    toolResults: any[];
    providerMetadata?: any;
  }> {
    if (!this.tools) {
      throw new Error('Tools must be provided to use getToolResults');
    }

    try {
      const options: any = {
        model: deepseek(this.modelName),
        prompt,
        tools: this.tools,
        toolChoice: this.toolChoice,
        maxSteps: this.maxSteps || 2 // Default to 2 steps if not set
      };
      
      // Add system prompt if provided
      if (this.system) {
        options.system = this.system;
      }
      
      // Add history if provided, but make sure not to set both prompt and messages
      if (history && history.length > 0) {
        // For DeepSeek, we need to include the current prompt in the messages history
        // instead of passing it separately
        const lastUserMessage = {
          role: "user",
          content: prompt
        };
        options.messages = [...history, lastUserMessage];
        delete options.prompt; // Remove prompt since we're using messages instead
      }
      
      const result = await generateText(options);
      
      // Extract tool calls and results from all steps
      const toolCalls = result.steps.flatMap(step => step.toolCalls || []);
      const toolResults = result.steps.flatMap(step => step.toolResults || []);
      
      return {
        text: result.text,
        steps: result.steps,
        toolCalls,
        toolResults,
        providerMetadata: result.providerMetadata
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
   * Send function results back to the LLM to continue the conversation
   */
  async sendFunctionResults(
    steps: any[],
    toolName: string,
    result: string,
    history: any[] = []
  ): Promise<{
    text: string;
    steps: any[];
    toolCalls: any[];
    toolResults: any[];
    providerMetadata?: any;
  }> {
    if (!this.tools) {
      throw new Error('Tools must be provided to use sendFunctionResults');
    }

    try {
      // For DeepSeek, we need to create a message that includes the function result
      const systemMessage = {
        role: "system",
        content: `Function ${toolName} returned: ${result}`
      };
      
      // Create a synthetic prompt that asks for continuation
      const functionResultPrompt = "Continue with the conversation based on the function result";
      
      // If we have history, append the system message
      const updatedHistory = history && history.length > 0 
        ? [...history, systemMessage]
        : [systemMessage];
      
      // Get response with possible tool calls
      return this.getToolResults(functionResultPrompt, updatedHistory);
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
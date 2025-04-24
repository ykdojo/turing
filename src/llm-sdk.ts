import 'dotenv/config';
import { ToolSet } from 'ai';
import { GeminiSDK } from './gemini-sdk.js';
import { DeepseekSDK } from './deepseek-sdk.js';

/**
 * Types of LLM providers supported by the common SDK
 */
export type LLMProvider = 'gemini' | 'deepseek';

/**
 * Common configuration for all LLM providers
 */
export interface LLMConfig {
  modelName: string;
  tools?: ToolSet;
  toolChoice?: 'auto' | 'required' | 'none';
  maxSteps?: number;
  system?: string;
}

/**
 * Common result structure for tool calls
 */
export interface ToolCallResult {
  text: string;
  steps: any[];
  toolCalls: any[];
  toolResults: any[];
  providerMetadata?: any;
}

/**
 * Common LLM SDK interface
 */
export class LLMSDK {
  private provider: LLMProvider;
  private sdk: GeminiSDK | DeepseekSDK;

  /**
   * Create a new LLM SDK instance
   */
  constructor(provider: LLMProvider, config: LLMConfig) {
    this.provider = provider;

    // Initialize the appropriate provider SDK
    switch (provider) {
      case 'gemini':
        this.sdk = new GeminiSDK(
          config.modelName,
          config.tools,
          config.toolChoice,
          config.maxSteps || 2,
          config.system
        );
        break;
      case 'deepseek':
        this.sdk = new DeepseekSDK(
          config.modelName,
          config.tools,
          config.toolChoice,
          config.maxSteps || 2,
          config.system
        );
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  /**
   * Send a message to the LLM and receive a text response
   */
  async sendMessage(prompt: string, history?: any[]): Promise<string> {
    if (this.provider === 'gemini') {
      return (this.sdk as GeminiSDK).sendMessage(prompt, history);
    } else {
      // DeepseekSDK doesn't support history in sendMessage yet
      return (this.sdk as DeepseekSDK).sendMessage(prompt);
    }
  }

  /**
   * Send a message to the LLM and get detailed results including tool calls and results
   */
  async getToolResults(prompt: string, history?: any[]): Promise<ToolCallResult> {
    if (this.provider === 'gemini') {
      return (this.sdk as GeminiSDK).getToolResults(prompt, history);
    } else {
      // DeepseekSDK doesn't support history in getToolResults yet
      return (this.sdk as DeepseekSDK).getToolResults(prompt);
    }
  }

  /**
   * Send function results back to the LLM and get a follow-up response
   * Currently only supported for Gemini
   */
  async sendFunctionResults(
    steps: any[],
    functionName: string,
    result: string,
    history?: any[]
  ): Promise<ToolCallResult> {
    if (this.provider === 'gemini') {
      return (this.sdk as GeminiSDK).sendFunctionResults(steps, functionName, result, history);
    } else {
      throw new Error('sendFunctionResults is not supported for DeepseekSDK yet');
    }
  }

  /**
   * Get the underlying provider-specific SDK instance
   */
  getProviderSDK(): GeminiSDK | DeepseekSDK {
    return this.sdk;
  }
}
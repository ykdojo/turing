import 'dotenv/config';
import { google } from '@ai-sdk/google';
import { streamText, ToolSet, TextStreamPart } from 'ai';
import { ReadableStream } from 'stream/web';

// AI SDK requires GOOGLE_GENERATIVE_AI_API_KEY environment variable
// Map from our existing GEMINI_API_KEY for compatibility
process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;

export class GeminiStreamingSDK {
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
   * Stream a response from the LLM
   * Returns both text stream for simple consumption and full stream for advanced use cases
   */
  streamMessage(prompt: string): {
    textStream: AsyncIterable<string> & ReadableStream<string>;
    fullStream: AsyncIterable<TextStreamPart> & ReadableStream<TextStreamPart>;
    textPromise: Promise<string>;
  } {
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

    const { textStream, fullStream, text } = streamText(options);
    
    return {
      textStream,
      fullStream,
      textPromise: text
    };
  }

  /**
   * Stream a response with tool calls from the LLM
   * Returns detailed streams with tool call information
   */
  streamToolCalls(prompt: string): {
    textStream: AsyncIterable<string> & ReadableStream<string>;
    fullStream: AsyncIterable<TextStreamPart> & ReadableStream<TextStreamPart>;
    toolCalls: Promise<any[]>;
    toolResults: Promise<any[]>;
    steps: Promise<any[]>;
    textPromise: Promise<string>;
  } {
    if (!this.tools) {
      throw new Error('Tools must be provided to use streamToolCalls');
    }

    try {
      const result = streamText({
        model: google(this.modelName),
        prompt,
        tools: this.tools,
        toolChoice: this.toolChoice,
        maxSteps: this.maxSteps || 2, // Default to 2 steps if not set
        toolCallStreaming: true // Enable streaming of tool call deltas
      });
      
      return {
        textStream: result.textStream,
        fullStream: result.fullStream,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        steps: result.steps,
        textPromise: result.text
      };
    } catch (error) {
      console.error('Error in streamToolCalls:', error);
      throw error;
    }
  }

  /**
   * Helper method to consume a text stream and provide callbacks for each chunk
   * @param stream The text stream to consume
   * @param onChunk Callback function that receives each text chunk
   * @param onDone Optional callback function called when stream is complete
   * @param onError Optional callback function for handling errors
   */
  static async consumeTextStream(
    stream: AsyncIterable<string>,
    onChunk: (chunk: string) => void,
    onDone?: (fullText: string) => void,
    onError?: (error: any) => void
  ): Promise<string> {
    let fullText = '';
    
    try {
      for await (const chunk of stream) {
        fullText += chunk;
        onChunk(chunk);
      }
      
      if (onDone) {
        onDone(fullText);
      }
      
      return fullText;
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error('Error consuming text stream:', error);
      }
      throw error;
    }
  }

  /**
   * Helper method to consume a full stream with all events
   * @param stream The full stream to consume
   * @param handlers Object with handler functions for different event types
   */
  static async consumeFullStream(
    stream: AsyncIterable<TextStreamPart>,
    handlers: {
      onTextDelta?: (text: string) => void;
      onToolCall?: (toolCall: any) => void;
      onToolResult?: (toolResult: any) => void;
      onError?: (error: any) => void;
      onFinish?: (result: any) => void;
    }
  ): Promise<void> {
    try {
      for await (const part of stream) {
        switch (part.type) {
          case 'text-delta':
            if (handlers.onTextDelta) {
              handlers.onTextDelta(part.textDelta);
            }
            break;
          case 'tool-call':
            if (handlers.onToolCall) {
              handlers.onToolCall(part);
            }
            break;
          case 'tool-result':
            if (handlers.onToolResult) {
              handlers.onToolResult(part);
            }
            break;
          case 'finish':
            if (handlers.onFinish) {
              handlers.onFinish(part);
            }
            break;
          case 'error':
            if (handlers.onError) {
              handlers.onError(part.error);
            } else {
              console.error('Stream error:', part.error);
            }
            break;
        }
      }
    } catch (error) {
      if (handlers.onError) {
        handlers.onError(error);
      } else {
        console.error('Error consuming full stream:', error);
      }
      throw error;
    }
  }
}
import 'dotenv/config';
import { deepseek } from '@ai-sdk/deepseek';
import { streamText, ToolSet, TextStreamPart } from 'ai';

export class DeepseekStreamingSDK {
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
   * Stream a response from the LLM
   * Returns both text stream for simple consumption and full stream for advanced use cases
   */
  streamMessage(prompt: string): {
    textStream: AsyncIterable<string>;
    fullStream: AsyncIterable<TextStreamPart<ToolSet>>;
    textPromise: Promise<string>;
  } {
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
    textStream: AsyncIterable<string>;
    fullStream: AsyncIterable<TextStreamPart<ToolSet>>;
    toolCalls: Promise<any[]>;
    toolResults: Promise<any[]>;
    steps: Promise<any[]>;
    textPromise: Promise<string>;
  } {
    if (!this.tools) {
      throw new Error('Tools must be provided to use streamToolCalls');
    }

    try {
      const options: any = {
        model: deepseek(this.modelName),
        prompt,
        tools: this.tools,
        toolChoice: this.toolChoice,
        maxSteps: this.maxSteps || 2, // Default to 2 steps if not set
        toolCallStreaming: true // Enable streaming of tool call deltas
      };
      
      // Add system prompt if provided
      if (this.system) {
        options.system = this.system;
      }
      
      const result = streamText(options);
      
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
    stream: AsyncIterable<TextStreamPart<ToolSet>>,
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
        // Handle different part types from the stream
        if (part.type === 'text-delta') {
          if (handlers.onTextDelta) {
            handlers.onTextDelta(part.textDelta);
          }
        } else if (part.type === 'tool-call') {
          if (handlers.onToolCall) {
            handlers.onToolCall(part);
          }
        // Handle tool-result type (using type assertion since it might not be in the type definition)
        } else if ((part as any).type === 'tool-result') {
          if (handlers.onToolResult) {
            handlers.onToolResult(part);
          }
        } else if (part.type === 'finish') {
          if (handlers.onFinish) {
            handlers.onFinish(part);
          }
        } else if (part.type === 'error') {
          if (handlers.onError) {
            handlers.onError((part as any).error);
          } else {
            console.error('Stream error:', (part as any).error);
          }
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
# LangChain Implementation Guide

This document provides guidance on implementing the Gemini functionality using LangChain.js instead of the direct Google API. Based on the current implementation in the project, here's how you could replicate the functionality using LangChain.

## Basic Implementation

```typescript
import 'dotenv/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';

export class LangchainSDK {
  private apiKey: string;

  constructor(private modelName: string) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  async sendMessage(prompt: string): Promise<string> {
    const model = new ChatGoogleGenerativeAI({
      modelName: this.modelName,
      maxOutputTokens: 2048,
      temperature: 1,
      topP: 0.95,
      topK: 64,
      apiKey: this.apiKey,
    });
    
    const response = await model.invoke(new HumanMessage(prompt));
    return response.content.toString();
  }
}

// More comprehensive implementation with chat history and function calling
export class AdvancedLangchainAPI {
  private apiKey: string;
  private modelName: string;
  private temperature: number;
  private topP: number;
  private topK: number;
  private maxOutputTokens: number;
  private systemInstruction?: string;
  private tools: StructuredTool[];

  constructor(
    modelName: string,
    config = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 2048,
    },
    enableFunctionCalling = false,
    systemInstruction?: string,
    tools: StructuredTool[] = []
  ) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
    
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = modelName;
    this.temperature = config.temperature;
    this.topP = config.topP;
    this.topK = config.topK;
    this.maxOutputTokens = config.maxOutputTokens;
    this.systemInstruction = systemInstruction;
    this.tools = tools;
  }

  async startChat(history: any[] = []) {
    // Convert history to LangChain message format
    const messages = history.map(msg => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.parts[0].text);
      } else {
        return new AIMessage(msg.parts[0].text);
      }
    });

    // Add system instruction if available
    if (this.systemInstruction) {
      messages.unshift(new SystemMessage(this.systemInstruction));
    }

    // Return chat interface
    return {
      sendMessage: async (text: string) => {
        const model = new ChatGoogleGenerativeAI({
          modelName: this.modelName,
          temperature: this.temperature,
          topP: this.topP,
          topK: this.topK,
          maxOutputTokens: this.maxOutputTokens,
          apiKey: this.apiKey,
          tools: this.tools.length > 0 ? this.tools : undefined,
        });
        
        // Add the new message to history
        messages.push(new HumanMessage(text));
        
        // Send to model
        const response = await model.invoke(messages);
        
        // Add response to history
        messages.push(response);
        
        return {
          response: {
            text: () => response.content.toString()
          }
        };
      }
    };
  }

  async sendMessage(message: string, history: any[] = []) {
    const chat = await this.startChat(history);
    const result = await chat.sendMessage(message);
    return result.response.text();
  }
}
```

## Function Calling Implementation

For function calling, LangChain uses the concept of "tools" which are structured as follows:

```typescript
import { StructuredTool } from '@langchain/core/tools';

const terminalCommandTool = new StructuredTool({
  name: "terminal_command",
  description: "Execute a command in the terminal",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to execute"
      }
    },
    required: ["command"]
  },
  func: async ({ command }) => {
    // Implementation of command execution
    return "Command executed: " + command;
  }
});

// Then pass this tool to your model:
const model = new ChatGoogleGenerativeAI({
  // ...other config
  tools: [terminalCommandTool],
});
```

## Handling Function Call Responses

In LangChain.js, function calls are processed using a structured output parser:

```typescript
import { HumanMessage } from '@langchain/core/messages';

// When processing a message that might have function calls
const result = await model.invoke(new HumanMessage(prompt));

// Check if there's a function call
if (result.additional_kwargs?.tool_calls) {
  // Process the function calls
  for (const toolCall of result.additional_kwargs.tool_calls) {
    const toolName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    
    // Execute the tool/function
    // ...
    
    // Send the result back to the model
    const toolResult = "result of tool execution";
    
    // Create a new message to send back to the model
    const messages = [
      // Previous messages
      new HumanMessage(prompt),
      new AIMessage({
        content: "",
        additional_kwargs: {
          tool_calls: [toolCall]
        }
      }),
      new ToolMessage({
        content: toolResult,
        tool_call_id: toolCall.id
      })
    ];
    
    // Get the final response
    const finalResponse = await model.invoke(messages);
  }
}
```

## Full Implementation Guidance

1. Start by implementing the basic `LangchainSDK` class for simple message exchanges
2. Add the more advanced `AdvancedLangchainAPI` with support for chat history
3. Implement function calling using LangChain's tool framework
4. Add system instructions support

The implementation should mirror the functionality in the existing `GeminiAPI` class while leveraging LangChain.js abstractions for better maintainability and composability with other LangChain components.
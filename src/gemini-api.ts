import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import mime from 'mime-types';

// Initialize environment variables
config();

// API key verification
const getApiKey = (): string => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in environment variables. Make sure to set it in .env file or directly in your environment');
  }
  return apiKey;
};

// Default configuration
const defaultGenerationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 65536,
  responseModalities: [],
  responseMimeType: "text/plain",
};

// Terminal command tool declaration
const terminalCommandTool = {
  functionDeclarations: [
    {
      name: "runTerminalCommand",
      description: "Run a terminal command on the user's system",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The terminal command to execute"
          },
          isSafe: {
            type: "boolean",
            description: "Whether the command is considered safe to run"
          }
        },
        required: ["command", "isSafe"]
      }
    }
  ]
};

// Class to handle Gemini API interactions
export class GeminiAPI {
  private genAI: GoogleGenAI;
  private modelName: string;
  private generationConfig: any;
  private tools: any[];
  private toolConfig: any;
  private systemInstruction: {text: string}[] | undefined;

  constructor(
    modelName: string, 
    config = defaultGenerationConfig,
    enableFunctionCalling = false,
    systemInstruction?: string
  ) {
    this.genAI = new GoogleGenAI({
      apiKey: getApiKey()
    });
    
    this.modelName = modelName;
    this.tools = enableFunctionCalling ? [terminalCommandTool] : [];
    this.toolConfig = enableFunctionCalling ? {functionCallingConfig: {mode: "AUTO"}} : undefined;
    this.systemInstruction = systemInstruction ? [{text: systemInstruction}] : undefined;
    this.generationConfig = config;
  }

  // Start a chat session
  startChat(history: any[] = []) {
    const chat = {
      history,
      sendMessage: async (message: string | any[]) => {
        let contents;
        
        if (typeof message === 'string') {
          contents = [
            {
              role: 'user',
              parts: [{ text: message }]
            }
          ];
        } else {
          contents = [
            {
              role: 'user',
              parts: message
            }
          ];
        }
        
        // Include history if available
        if (history.length > 0) {
          contents = [...history, ...contents];
        }

        const options: any = {
          model: this.modelName,
          config: this.generationConfig,
          contents,
        };
        
        if (this.tools.length > 0) {
          options.tools = this.tools;
          options.toolConfig = this.toolConfig;
        }
        
        if (this.systemInstruction) {
          options.config = {
            ...options.config,
            systemInstruction: this.systemInstruction,
          };
        }
        
        const response = await this.genAI.models.generateContent(options);
        
        // Update history with the new messages
        history.push(contents[contents.length - 1]);
        if (response.candidates?.[0]?.content) {
          history.push(response.candidates[0].content);
        }
        
        // Create a wrapper with text() method for backward compatibility
        const wrappedResponse = {
          ...response,
          response: {
            text: () => {
              if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
                return response.candidates[0].content.parts[0].text;
              }
              return '';
            }
          }
        };
        
        return wrappedResponse;
      }
    };
    
    return chat;
  }

  // Process inline data from response (like images)
  processInlineData(result: any) {
    // Skip processing if response structure is unexpected or missing
    if (!result?.candidates && !result?.response?.candidates) {
      return;
    }
    
    const candidates = result.candidates || result.response.candidates;
    if (!Array.isArray(candidates)) {
      return;
    }
    
    for (let candidate_index = 0; candidate_index < candidates.length; candidate_index++) {
      if (!candidates[candidate_index]?.content?.parts) continue;
      
      for (let part_index = 0; part_index < candidates[candidate_index].content.parts.length; part_index++) {
        const part = candidates[candidate_index].content.parts[part_index];
        if (part.inlineData) {
          try {
            const filename = `output_${candidate_index}_${part_index}.${mime.extension(part.inlineData.mimeType)}`;
            fs.writeFileSync(filename, Buffer.from(part.inlineData.data, 'base64'));
            console.log(`Output written to: ${filename}`);
          } catch (err) {
            console.error(err);
          }
        }
      }
    }
  }

  // Process function calls from response
  processFunctionCalls(result: any) {
    const functionCalls: Array<{name: string; args: any}> = [];
    
    // Skip processing if response structure is unexpected or missing
    if (!result?.candidates && !result?.response?.candidates) {
      return functionCalls;
    }
    
    const candidates = result.candidates || result.response.candidates;
    if (!Array.isArray(candidates)) {
      return functionCalls;
    }
    
    for (const candidate of candidates) {
      if (!candidate?.content?.parts) continue;
      
      for (const part of candidate.content.parts) {
        if (part.functionCall) {
          functionCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args
          });
        }
      }
    }
    
    return functionCalls;
  }

  // Send function call results back to the model
  async sendFunctionResults(chatSession: any, functionName: string, result: string) {
    try {
      // Format the function response parts according to Gemini API requirements
      const parts = [
        {
          functionResponse: {
            name: functionName,
            response: {
              content: result
            }
          }
        }
      ];
      
      // Send the result to the model
      const response = await chatSession.sendMessage(parts);
      
      // Process the response for possible additional function calls
      const functionCalls = this.processFunctionCalls(response);
      if (functionCalls.length > 0) {
        return {
          text: response.response?.text() || '',
          functionCalls,
          response: response // Return the raw response for potential further interactions
        };
      }
      
      return response.response?.text() || '';
    } catch (error) {
      console.error("Error sending function results:", error);
      console.error(error instanceof Error ? error.stack : String(error));
      return "Error processing function results.";
    }
  }

  // Simple function to send a message and get a response
  async sendMessage(message: string, history: any[] = []) {
    const chatSession = this.startChat(history);
    const result = await chatSession.sendMessage(message);
    this.processInlineData(result);
    
    // Check for function calls
    const functionCalls = this.processFunctionCalls(result);
    if (functionCalls.length > 0) {
      return {
        text: result.response?.text() || '',
        functionCalls,
        chatSession // Return the chat session for continuous interaction
      };
    }
    
    return result.response?.text() || '';
  }
}

// No default instance exported - users must create instances with explicit model names
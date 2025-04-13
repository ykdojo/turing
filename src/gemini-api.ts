import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

// Class to handle Gemini API interactions
export class GeminiAPI {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private generationConfig: any;

  constructor(
    modelName: string, 
    config = defaultGenerationConfig
  ) {
    this.genAI = new GoogleGenerativeAI(getApiKey());
    this.model = this.genAI.getGenerativeModel({ model: modelName });
    this.generationConfig = config;
  }

  // Start a chat session
  startChat(history: any[] = []) {
    return this.model.startChat({
      generationConfig: this.generationConfig,
      history,
    });
  }

  // Process inline data from response (like images)
  processInlineData(result: any) {
    const candidates = result.response.candidates;
    for (let candidate_index = 0; candidate_index < candidates.length; candidate_index++) {
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

  // Simple function to send a message and get a response
  async sendMessage(message: string, history: any[] = []) {
    const chatSession = this.startChat(history);
    const result = await chatSession.sendMessage(message);
    this.processInlineData(result);
    return result.response.text();
  }
}

// No default instance exported - users must create instances with explicit model names
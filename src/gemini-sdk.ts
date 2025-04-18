import 'dotenv/config';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

// AI SDK requires GOOGLE_GENERATIVE_AI_API_KEY environment variable
// Map from our existing GEMINI_API_KEY for compatibility
process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;

export class GeminiSDK {
  constructor(private modelName: string) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
  }

  async sendMessage(prompt: string): Promise<string> {
    const { text } = await generateText({
      model: google(this.modelName),
      prompt
    });
    
    return text;
  }
}
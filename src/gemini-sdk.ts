import { config } from 'dotenv';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

// Initialize environment variables
config();

// Set Google API key from Gemini key
process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;

export class GeminiSDK {
  private modelName: string;

  constructor(modelName: string) {
    // Check for API key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment variables. Make sure to set it in .env file');
    }
    
    this.modelName = modelName;
  }

  // Simple function to send a message and get a response
  async sendMessage(prompt: string): Promise<string> {
    try {
      const { text } = await generateText({
        model: google(this.modelName),
        prompt
      });
      
      return text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }
}
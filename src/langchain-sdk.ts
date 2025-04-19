import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

export class LangchainSDK {
  private modelName: string;
  private genAI: GoogleGenAI;
  private config: any;

  constructor(
    modelName: string, 
    config: any = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 2048,
    }
  ) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
    this.modelName = modelName;
    this.config = config;
    
    this.genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }

  async sendMessage(prompt: string): Promise<string> {
    try {
      const options = {
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          ...this.config,
          responseMimeType: 'text/plain'
        }
      };
      
      // Use the Google GenAI library directly
      const response = await this.genAI.models.generateContent(options);
      
      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.candidates[0].content.parts[0].text;
      }
      
      // Handle possible alternative response formats
      if (response.candidates?.[0]?.content?.text) {
        return response.candidates[0].content.text;
      }

      if (response.text) {
        return response.text();
      }
      
      // If we get here, we have a response but can't extract text in any known format
      if (response.candidates && response.candidates.length > 0) {
        return JSON.stringify(response.candidates[0]);
      }
      
      return '';
    } catch (error) {
      console.error('Error sending message with model', this.modelName, ':', error);
      throw new Error(`Failed to get response from model ${this.modelName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
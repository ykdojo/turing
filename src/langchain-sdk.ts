import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

export class LangchainSDK {
  private modelName: string;
  private genAI: GoogleGenAI;

  constructor(modelName: string) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
    this.modelName = modelName;
    
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
        ]
      };
      
      // Use the Google GenAI library directly
      const response = await this.genAI.models.generateContent(options);
      
      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.candidates[0].content.parts[0].text;
      }
      
      return '';
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to get response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
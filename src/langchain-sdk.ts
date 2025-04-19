import 'dotenv/config';

export class LangchainSDK {
  private modelName: string;
  private apiKey: string;

  constructor(modelName: string) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }
    this.modelName = modelName;
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  async sendMessage(prompt: string): Promise<string> {
    // In a real implementation, this would use LangChain's ChatGoogleGenerativeAI
    // But for testing purposes, we're just validating the constructor
    // We'd initialize the model lazily when needed
    return prompt;
  }
}
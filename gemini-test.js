import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'node:fs';
import mime from 'mime-types';

config();

const apiKey = process.env.GEMINI_API_KEY;

// Verify API key exists
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY not found in environment variables');
  console.error('Make sure to set it in .env file or directly in your environment');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-thinking-exp-01-21",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 65536,
  responseModalities: [
  ],
  responseMimeType: "text/plain",
};

async function run() {
  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [
          {text: "hi"},
        ],
      },
      {
        role: "model",
        parts: [
          {text: "Thinking Process:\n\n1.  **Identify the input:** The user simply said \"hi\".\n2.  **Recognize the intent:** This is a standard greeting, initiating a conversation.\n3.  **Determine the appropriate response:** A polite and friendly greeting in return is the most suitable response.\n4.  **Formulate the response:**\n    *   Start with a reciprocal greeting: \"Hi there!\" or \"Hello!\" or \"Hi!\".\n    *   Add a polite follow-up to encourage further interaction: \"How can I help you today?\" or \"What can I do for you?\" or \"Is there anything I can assist you with?\".\n    *   Combine them for a natural flow.\n5.  **Select the best option:** \"Hi there! How can I help you today?\" is friendly, polite, and directly asks how the user wants to proceed. \"Hello!\" is also good but less engaging. \"Hi!\" is too minimal.\n6.  **Final Output:** \"Hi there! How can I help you today?\""},
          {text: "Hi there! How can I help you today?"},
        ],
      },
    ],
  });

  const result = await chatSession.sendMessage("Tell me about the history of AI in 2-3 sentences.");
  // TODO: Following code needs to be updated for client-side apps.
  const candidates = result.response.candidates;
  for(let candidate_index = 0; candidate_index < candidates.length; candidate_index++) {
    for(let part_index = 0; part_index < candidates[candidate_index].content.parts.length; part_index++) {
      const part = candidates[candidate_index].content.parts[part_index];
      if(part.inlineData) {
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
  console.log(result.response.text());
}

run();
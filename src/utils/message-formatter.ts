// Utility for formatting messages for the Gemini API

type MessagePart = {
  text: string;
};

export interface FormattedMessage {
  role: 'user' | 'model';
  parts: MessagePart[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isLoading?: boolean;
  functionCalls?: Array<{
    name: string;
    args: {
      command: string;
      isSafe: boolean;
    };
    result?: string;
    executed?: boolean;
  }>;
  chatSession?: any;
}

/**
 * Formats chat messages for the Gemini API
 * - Filters out loading messages
 * - Converts roles to Gemini's expected format
 * - Ensures non-empty text for function call messages
 */
export function formatMessagesForGeminiAPI(messages: Message[]): FormattedMessage[] {
  return messages
    .filter(msg => !msg.isLoading) // Filter out loading messages
    .map(msg => {
      if (msg.role === 'system') {
        return { role: 'model', parts: [{ text: msg.content }] };
      } else if (msg.role === 'assistant' && msg.functionCalls && msg.functionCalls.length > 0) {
        // For assistant messages with function calls, ensure they have text content
        // This prevents the "empty text parameter" error when sending a follow-up message
        return {
          role: 'model',
          parts: [{ text: msg.content || "I'll process that for you." }]
        };
      } else {
        return {
          role: msg.role === 'assistant' ? 'model' : 'user', 
          parts: [{ text: msg.content }]
        };
      }
    });
}
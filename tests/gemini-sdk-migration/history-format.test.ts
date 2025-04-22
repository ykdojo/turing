import { describe, it, expect, jest } from '@jest/globals';
import { formatMessagesForAISDK, Message } from '../../src/utils/message-formatter.js';

describe('GeminiSDK Migration - History Format', () => {
  it('should properly format chat history for AI SDK', () => {
    // Sample messages in our internal format
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant',
      },
      {
        role: 'user',
        content: 'Hello! How are you?',
      },
      {
        role: 'assistant',
        content: 'I\'m doing well, thank you for asking. How can I help you today?',
      },
      {
        role: 'user',
        content: 'Tell me about AI',
      },
      {
        role: 'assistant',
        content: 'AI stands for artificial intelligence...',
        isLoading: false,
      },
      {
        role: 'assistant',
        content: 'This message is loading',
        isLoading: true,
      }
    ];

    // Format for AI SDK
    const { messages: aiSdkFormattedMessages, systemPrompt } = formatMessagesForAISDK(messages);

    // Verify results
    expect(aiSdkFormattedMessages).toHaveLength(4); // Should filter out loading and system messages
    expect(systemPrompt).toBe('You are a helpful assistant');
    
    // Check first message is now the user message (system is extracted)
    expect(aiSdkFormattedMessages[0]).toEqual({
      role: 'user',
      content: 'Hello! How are you?'
    });
    
    // Check assistant message format
    expect(aiSdkFormattedMessages[1]).toEqual({
      role: 'assistant',
      content: 'I\'m doing well, thank you for asking. How can I help you today?'
    });
  });
  
  it('should handle empty history', () => {
    const emptyHistory: Message[] = [];
    const { messages, systemPrompt } = formatMessagesForAISDK(emptyHistory);
    expect(messages).toEqual([]);
    expect(systemPrompt).toBeUndefined();
  });
  
  it('should filter out loading messages', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: 'Hello',
      },
      {
        role: 'assistant',
        content: 'Loading...',
        isLoading: true,
      }
    ];
    
    const { messages: formatted, systemPrompt } = formatMessagesForAISDK(messages);
    expect(formatted).toHaveLength(1);
    expect(formatted[0].role).toBe('user');
    expect(systemPrompt).toBeUndefined();
  });
});
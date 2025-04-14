/**
 * @jest-environment node
 */
import { formatMessagesForGeminiAPI, Message } from '../src/utils/message-formatter';

describe('Message Formatter Utility', () => {
  test('should format regular messages correctly', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
      { role: 'system', content: 'Processing command' }
    ];
    
    const formatted = formatMessagesForGeminiAPI(messages);
    
    expect(formatted.length).toBe(3);
    expect(formatted[0].role).toBe('user');
    expect(formatted[0].parts[0].text).toBe('Hello');
    expect(formatted[1].role).toBe('model');
    expect(formatted[1].parts[0].text).toBe('Hi there');
    expect(formatted[2].role).toBe('model');
    expect(formatted[2].parts[0].text).toBe('Processing command');
  });

  test('should filter out loading messages', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: '', isLoading: true },
      { role: 'system', content: 'Processing command' }
    ];
    
    const formatted = formatMessagesForGeminiAPI(messages);
    
    expect(formatted.length).toBe(2); // Not 3, because loading is filtered
    expect(formatted[0].role).toBe('user');
    expect(formatted[1].role).toBe('model');
  });

  test('should handle assistant messages with function calls', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Run ls command' },
      { 
        role: 'assistant', 
        content: '', // Empty content
        functionCalls: [
          {
            name: 'runTerminalCommand',
            args: {
              command: 'ls -la',
              isSafe: true
            }
          }
        ]
      }
    ];
    
    const formatted = formatMessagesForGeminiAPI(messages);
    
    expect(formatted.length).toBe(2);
    expect(formatted[1].role).toBe('model');
    // Should provide default text instead of empty string
    expect(formatted[1].parts[0].text).toBe("I'll process that for you.");
  });

  test('should handle assistant messages with function calls and content', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Run ls command' },
      { 
        role: 'assistant', 
        content: 'Let me list those files for you.', 
        functionCalls: [
          {
            name: 'runTerminalCommand',
            args: {
              command: 'ls -la',
              isSafe: true
            }
          }
        ]
      }
    ];
    
    const formatted = formatMessagesForGeminiAPI(messages);
    
    expect(formatted.length).toBe(2);
    expect(formatted[1].role).toBe('model');
    expect(formatted[1].parts[0].text).toBe('Let me list those files for you.');
  });
});
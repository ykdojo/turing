import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { getAIResponse } from './api.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export const App = () => {
  const initialMessages: Message[] = [
    { role: 'user', content: 'Hello, can you help me with a coding problem?' },
    { role: 'assistant', content: 'Of course! What coding problem are you facing?' },
    { role: 'user', content: 'How do I create a React component?' },
  ];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    const lastUserMessage = initialMessages[initialMessages.length - 1].content;
    
    // Add loading message immediately
    setMessages(prev => [...prev, { role: 'assistant', content: '', isLoading: true }]);
    
    // Get AI response
    getAIResponse(lastUserMessage)
      .then(response => {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: response
          };
          return newMessages;
        });
        setIsComplete(true);
      });
  }, []);
  
  return (
    <Box flexDirection="column" padding={1}>
      {messages.map((message, index) => (
        <Box key={index} marginY={1} flexDirection="column">
          <Text bold color={message.role === 'user' ? 'green' : 'blue'}>
            {message.role === 'user' ? '🧑 You:' : '🤖 AI:'}
          </Text>
          <Box marginLeft={2}>
            {message.isLoading ? (
              <Box>
                <Text color="cyan"><Spinner type="dots" /></Text>
                <Text> Thinking...</Text>
              </Box>
            ) : (
              <Text>{message.content}</Text>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
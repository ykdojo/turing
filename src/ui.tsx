import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { GeminiAPI } from './gemini-api.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export const App = () => {
  const initialMessages: Message[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hello! How can I help you today?' },
    { role: 'user', content: 'What model are you?' },
  ];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    const lastUserMessage = initialMessages[initialMessages.length - 1].content;
    
    // Add loading message immediately
    setMessages(prev => [...prev, { role: 'assistant', content: '', isLoading: true }]);
    
    try {
      // Create Gemini API instance and get response
      const modelName = 'gemini-2.0-flash-thinking-exp-01-21'; // Using verified working model
      const geminiApi = new GeminiAPI(modelName);
      
      // Convert messages to Gemini API history format
      const history = initialMessages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      
      geminiApi.sendMessage(lastUserMessage, history)
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
        })
        .catch(error => {
          console.error('Error from Gemini API:', error);
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: `Error: Could not get response from Gemini API. Make sure your GEMINI_API_KEY is set.`
            };
            return newMessages;
          });
          setIsComplete(true);
        });
    } catch (error) {
      console.error('Error initializing Gemini API:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: `Error: Could not initialize Gemini API. Make sure your GEMINI_API_KEY is set.`
        };
        return newMessages;
      });
      setIsComplete(true);
    }
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
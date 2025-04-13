import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export const ChatApp = () => {
  // Sample initial messages
  const initialMessages: Message[] = [
    { role: 'assistant', content: 'Hello! How can I help you today?' },
    { role: 'user', content: 'Can you tell me about yourself?' },
    { role: 'assistant', content: 'I\'m a conversational AI assistant. I can answer questions, discuss various topics, and help with tasks. What would you like to know?' },
  ];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const { exit } = useApp();
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }
    
    if (key.return) {
      if (inputText.trim() !== '') {
        // Add user message
        setMessages(prev => [
          ...prev, 
          { role: 'user', content: inputText }
        ]);
        
        // Store message for response
        const userMessage = inputText;
        setInputText('');
        
        // Add loading message
        setMessages(prev => [
          ...prev, 
          { role: 'assistant', content: '', isLoading: true }
        ]);
        
        // Mock API call with timeout
        setTimeout(() => {
          setMessages(prev => {
            const newMsgs = [...prev];
            // Replace loading message with actual response
            newMsgs[newMsgs.length - 1] = { 
              role: 'assistant', 
              content: `You said: "${userMessage}". This is a mock response.` 
            };
            return newMsgs;
          });
        }, 1000);
      }
    } else if (key.backspace || key.delete) {
      setInputText(prev => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta && !key.escape && 
              !key.rightArrow && !key.leftArrow && 
              !key.upArrow && !key.downArrow && 
              !key.tab) {
      setInputText(prev => prev + input);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Message history */}
      <Box flexDirection="column" flexGrow={1}>
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
                <Text wrap="wrap">{message.content}</Text>
              )}
            </Box>
          </Box>
        ))}
      </Box>
      
      {/* Input prompt with cursor indicator */}
      <Box borderStyle="single" borderColor="gray" padding={1}>
        <Text>{`> ${inputText}`}<Text backgroundColor="white"> </Text></Text>
      </Box>
    </Box>
  );
};
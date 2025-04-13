import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { GeminiAPI } from './gemini-api.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

// Initialize Gemini API with a working model
const geminiApi = new GeminiAPI('gemini-2.0-flash-thinking-exp-01-21');

export const ChatApp = () => {
  // Start with a completely empty chat history
  const initialMessages: Message[] = [];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
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
        
        // Store message for API call
        const userMessage = inputText;
        setInputText('');
        
        // Add loading message
        setMessages(prev => [
          ...prev, 
          { role: 'assistant', content: '', isLoading: true }
        ]);
        
        // Format history for Gemini API
        const formattedHistory = messages
          .filter(msg => !msg.isLoading) // Filter out loading messages
          .map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user', // Map 'assistant' to 'model' for Gemini API
            parts: [{ text: msg.content }]
          }));
        
        // Call Gemini API
        geminiApi.sendMessage(userMessage, formattedHistory)
          .then(response => {
            setMessages(prev => {
              const newMsgs = [...prev];
              // Replace loading message with actual response
              newMsgs[newMsgs.length - 1] = { 
                role: 'assistant', 
                content: response
              };
              return newMsgs;
            });
            
            // Update chat history
            setChatHistory(prev => [
              ...prev,
              { role: 'user', parts: [{ text: userMessage }] },
              { role: 'model', parts: [{ text: response }] }
            ]);
          })
          .catch(error => {
            setMessages(prev => {
              const newMsgs = [...prev];
              // Replace loading message with error
              newMsgs[newMsgs.length - 1] = { 
                role: 'assistant', 
                content: `Error: ${error.message}` 
              };
              return newMsgs;
            });
          });
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
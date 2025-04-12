import React from 'react';
import { Box, Text } from 'ink';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const App = () => {
  const messages: Message[] = [
    { role: 'user', content: 'Hello, can you help me with a coding problem?' },
    { role: 'assistant', content: 'Of course! What coding problem are you facing?' },
    { role: 'user', content: 'How do I create a React component?' },
    { role: 'assistant', content: "Here's a simple React component example:\n\nfunction Greeting({ name }) {\n  return <h1>Hello, {name}!</h1>;\n}" }
  ];

  return (
    <Box flexDirection="column" padding={1}>
      {messages.map((message, index) => (
        <Box key={index} marginY={1} flexDirection="column">
          <Text bold color={message.role === 'user' ? 'green' : 'blue'}>
            {message.role === 'user' ? '🧑 You:' : '🤖 AI:'}
          </Text>
          <Box marginLeft={2}>
            <Text>{message.content}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};
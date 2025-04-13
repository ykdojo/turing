import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { useChatController, Message } from './chat-controller.js';

export const ChatApp = () => {
  const { 
    messages, 
    inputText, 
    messageToExecute,
    pendingExecution,
    handleEnterKey,
    updateInputText,
    appendToInputText,
    backspaceInputText
  } = useChatController();
  
  const { exit } = useApp();
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }
    
    if (key.return) {
      handleEnterKey();
    } else if (key.backspace || key.delete) {
      backspaceInputText();
    } else if (!key.ctrl && !key.meta && !key.escape && 
               !key.rightArrow && !key.leftArrow && 
               !key.upArrow && !key.downArrow && 
               !key.tab) {
      appendToInputText(input);
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
                <Box flexDirection="column">
                  <Text wrap="wrap">{message.content}</Text>
                  
                  {message.functionCalls && message.functionCalls.length > 0 && (
                    <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="yellow" padding={1}>
                      <Text bold color="yellow">Function Call:</Text>
                      {message.functionCalls.map((call, idx) => (
                        <Box key={idx} flexDirection="column" marginLeft={1}>
                          <Text color="yellow">• {call.name}</Text>
                          <Box marginLeft={2}>
                            <Text color="cyan">Command: </Text>
                            <Text>{call.args.command}</Text>
                          </Box>
                          <Box marginLeft={2}>
                            <Text color="cyan">Safe: </Text>
                            <Text color={call.args.isSafe ? "green" : "red"}>
                              {call.args.isSafe ? "Yes" : "No"}
                            </Text>
                          </Box>
                          {call.executed && (
                            <Box marginLeft={2} marginTop={1}>
                              <Text color="cyan">Result: </Text>
                              <Text>{call.result}</Text>
                            </Box>
                          )}
                          {call.args.isSafe && !call.executed && (
                            <Box marginLeft={2} marginTop={1}>
                              <Text color="magenta">Press Enter to execute this command</Text>
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
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
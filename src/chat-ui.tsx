import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { useChatController } from './chat-controller.js';

export const ChatApp = () => {
  const { 
    messages, 
    inputText, 
    isHistoryMode,
    selectedMessageIndex,
    handleEnterKey,
    appendToInputText,
    backspaceInputText,
    toggleHistoryMode,
    selectPreviousMessage,
    selectNextMessage,
    useSelectedMessage
  } = useChatController();
  
  const { exit } = useApp();
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }
    
    if (isHistoryMode) {
      // Special handling in history mode
      if (key.escape) {
        // Exit history mode
        toggleHistoryMode();
      } else if (key.return) {
        // Use the selected message
        useSelectedMessage();
      } else if (key.upArrow) {
        // Navigate to previous message
        selectPreviousMessage();
      } else if (key.downArrow) {
        // Navigate to next message
        selectNextMessage();
      }
    } else {
      // Normal input mode
      if (key.return) {
        handleEnterKey();
      } else if (key.backspace || key.delete) {
        backspaceInputText();
      } else if (key.escape) {
        // Enter history mode (works even with text in the input box)
        toggleHistoryMode();
      } else if (!key.ctrl && !key.meta && 
                 !key.rightArrow && !key.leftArrow && 
                 !key.upArrow && !key.downArrow && 
                 !key.tab) {
        appendToInputText(input);
      }
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
                      {message.functionCalls.map((call: any, idx: number) => (
                        <Box key={idx} flexDirection="column" marginLeft={1}>
                          <Text color="yellow">• {call.name}</Text>
                          {/* Display appropriate information based on function type */}
                          {call.name === "runTerminalCommand" && (
                            <React.Fragment>
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
                            </React.Fragment>
                          )}
                          
                          {call.name === "editFile" && (
                            <React.Fragment>
                              <Box marginLeft={2}>
                                <Text color="cyan">File: </Text>
                                <Text>{call.args.filePath}</Text>
                              </Box>
                              <Box marginLeft={2}>
                                <Text color="cyan">Search: </Text>
                                <Text>"{call.args.searchString}"</Text>
                              </Box>
                              <Box marginLeft={2}>
                                <Text color="cyan">Replace: </Text>
                                <Text>"{call.args.replaceString}"</Text>
                              </Box>
                              <Box marginLeft={2}>
                                <Text color="cyan">Safe: </Text>
                                <Text color="green">Yes</Text>
                              </Box>
                            </React.Fragment>
                          )}
                          
                          {call.executed && (
                            <Box marginLeft={2} marginTop={1}>
                              <Text color="cyan">Result: </Text>
                              <Text>{call.result}</Text>
                            </Box>
                          )}
                          
                          {/* Only show prompt for unsafe terminal commands */}
                          {call.name === "runTerminalCommand" && !call.args.isSafe && !call.executed && (
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
      
      {/* Input prompt with cursor indicator or history mode display */}
      {isHistoryMode ? (
        <Box flexDirection="column" borderStyle="single" borderColor="magenta" padding={1}>
          <Text bold color="magenta">History Mode (Use ↑/↓ to navigate, Enter to select, Esc to exit)</Text>
          {messages
            .filter(msg => msg.role === 'user')
            .map((msg, idx) => {
              const isSelected = messages.indexOf(msg) === selectedMessageIndex;
              return (
                <Box key={idx} marginY={1}>
                  <Text color={isSelected ? 'green' : 'gray'} backgroundColor={isSelected ? 'black' : undefined}>
                    {isSelected ? '→ ' : '  '}{msg.content}
                  </Text>
                </Box>
              );
            })}
        </Box>
      ) : (
        <Box borderStyle="single" borderColor="gray" padding={1}>
          <Text>{`> ${inputText}`}<Text backgroundColor="white"> </Text></Text>
        </Box>
      )}
    </Box>
  );
};
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
    navigateHistory
  } = useChatController();
  
  const { exit } = useApp();
  
  // Get user messages for history selection
  const userMessages = messages.filter(msg => msg.role === 'user');
  
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
    } else if (key.escape) {
      toggleHistoryMode();
    } else if (key.upArrow && isHistoryMode) {
      navigateHistory('up');
    } else if (key.downArrow && isHistoryMode) {
      navigateHistory('down');
    } else if (!key.ctrl && !key.meta && 
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
        {messages
          // Filter messages when in history mode to only show up to the selected message
          .filter((_, index) => {
            if (!isHistoryMode || selectedMessageIndex === null) return true;
            
            const userMessagesUpToIndex = messages
              .slice(0, index + 1)
              .filter(msg => msg.role === 'user')
              .length;
              
            // Keep all messages up to and including the selected user message
            // plus any AI responses that came before it
            return userMessagesUpToIndex <= selectedMessageIndex + 1;
          })
          .map((message, index) => {
            const isSelected = isHistoryMode && 
                              message.role === 'user' && 
                              userMessages.indexOf(message) === selectedMessageIndex;
            
            return (
              <Box 
                key={index} 
                marginY={1} 
                flexDirection="column"
                borderStyle={isSelected ? "round" : undefined}
                borderColor={isSelected ? "blue" : undefined}
              >
                <Text bold color={message.role === 'user' ? 
                  (isHistoryMode && !isSelected ? 'gray' : 'gray') : 'white'}>
                  {message.role === 'user' ? 
                    (isSelected ? '> You:' : '> You:') : 
                    '>> Amp:'}
                </Text>
                <Box marginLeft={2}>
                  {message.isLoading ? (
                    <Box>
                      <Text color="cyan"><Spinner type="dots" /></Text>
                      <Text> Thinking...</Text>
                    </Box>
                  ) : (
                    <Box flexDirection="column">
                      <Text 
                        wrap="wrap" 
                        color={message.role === 'user' ? 'gray' : undefined}
                      >
                        {message.content}
                      </Text>
                      
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
            );
          })}
      </Box>
      
      {/* Show message count when in history mode */}
      {isHistoryMode && selectedMessageIndex !== null && (
        <Box justifyContent="center" marginY={1}>
          <Text color="blue">
            {`Showing message ${selectedMessageIndex + 1} of ${userMessages.length}`}
            {selectedMessageIndex < userMessages.length - 1 && 
              ` (${userMessages.length - selectedMessageIndex - 1} more hidden)`}
            {` - Press Enter to select and edit this message`}
          </Text>
        </Box>
      )}
      
      {/* Input prompt with cursor indicator or history mode indicator */}
      <Box borderStyle="single" borderColor={isHistoryMode ? "blue" : "gray"} padding={1}>
        {isHistoryMode ? (
          <Text color="blue">HISTORY MODE (Press ESC to exit, ↑/↓ to navigate, Enter to select message)</Text>
        ) : (
          <Text>{`> ${inputText}`}<Text backgroundColor="white"> </Text></Text>
        )}
      </Box>
    </Box>
  );
};
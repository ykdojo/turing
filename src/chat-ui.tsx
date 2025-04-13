import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { GeminiAPI } from './gemini-api.js';
import { exec } from 'child_process';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isLoading?: boolean;
  functionCalls?: Array<{
    name: string;
    args: {
      command: string;
      isSafe: boolean;
    };
    result?: string;
    executed?: boolean;
  }>;
  chatSession?: any; // Store the chat session for continuous function calling
}

// Initialize Gemini API with a working model and function calling enabled
const geminiApi = new GeminiAPI('gemini-2.0-flash', undefined, true);

export const ChatApp = () => {
  // Start with a completely empty chat history
  const initialMessages: Message[] = [];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [pendingExecution, setPendingExecution] = useState<boolean>(false);
  const [messageToExecute, setMessageToExecute] = useState<number | null>(null);
  const { exit } = useApp();
  
  // Function to execute a terminal command and handle function call loop
  const executeCommand = (command: string, messageIndex: number, callIndex: number, chatSession?: any) => {
    // Mark as pending execution
    setPendingExecution(true);
    
    exec(command, async (error, stdout, stderr) => {
      // Prepare result
      const result = error 
        ? `Error: ${error.message}` 
        : stderr 
          ? `${stderr}` 
          : stdout.trim() || 'Command executed successfully';
      
      // Update the message with the command result
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[messageIndex]?.functionCalls?.[callIndex]) {
          newMsgs[messageIndex].functionCalls![callIndex].executed = true;
          newMsgs[messageIndex].functionCalls![callIndex].result = result;
        }
        return newMsgs;
      });
      
      // Add a loading indicator for processing the function result
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: 'Processing command results...',
          isLoading: true
        }
      ]);
      
      // Update chat history with function execution info but without showing the result again
      setChatHistory(prev => [
        ...prev,
        { 
          role: 'system', 
          parts: [{ text: `Command executed: ${command}` }] 
        }
      ]);
      
      try {
        // Use the existing chat session if provided, otherwise create a new one
        const session = chatSession || geminiApi.startChat(chatHistory);
        const functionName = messages[messageIndex].functionCalls![callIndex].name;
        
        // Send function results back to the model
        const response = await geminiApi.sendFunctionResults(session, functionName, result);
        
        // Check if the response contains more function calls
        if (typeof response === 'object' && response.functionCalls && response.functionCalls.length > 0) {
          // Add the model's response with function calls
          setMessages(prev => {
            const newMsgs = [...prev];
            // Replace loading system message
            const loadingIndex = newMsgs.findIndex(m => m.isLoading);
            if (loadingIndex !== -1) {
              // Just remove the loading indicator since the function call UI already shows the result
              newMsgs.splice(loadingIndex, 1);
            }
            
            // Add AI's reasoning/analysis
            newMsgs.push({
              role: 'assistant',
              content: response.text,
              functionCalls: response.functionCalls
            });
            
            // Set message index for potential execution of next function call
            setMessageToExecute(newMsgs.length - 1);
            
            return newMsgs;
          });
          
          // Update chat history
          setChatHistory(prev => [
            ...prev,
            {
              role: 'model',
              parts: [{ text: response.text }]
            }
          ]);
          
          // Reset pending state - we'll wait for user to confirm the next function call
          setPendingExecution(false);
        } else {
          // No more function calls - just a regular response
          setMessages(prev => {
            const newMsgs = [...prev];
            // Replace loading system message
            const loadingIndex = newMsgs.findIndex(m => m.isLoading);
            if (loadingIndex !== -1) {
              // Just remove the loading indicator since the function call UI already shows the result
              newMsgs.splice(loadingIndex, 1);
            }
            
            // Add AI's final response
            newMsgs.push({
              role: 'assistant',
              content: typeof response === 'string' ? response : response.text
            });
            
            return newMsgs;
          });
          
          // Update chat history
          setChatHistory(prev => [
            ...prev,
            {
              role: 'model',
              parts: [{ text: typeof response === 'string' ? response : response.text }]
            }
          ]);
          
          // Reset states
          setPendingExecution(false);
          setMessageToExecute(null);
        }
      } catch (error) {
        console.error("Error handling function result:", error);
        
        // Update error in UI
        setMessages(prev => {
          const newMsgs = [...prev];
          // Replace loading message if any
          const loadingIndex = newMsgs.findIndex(m => m.isLoading);
          if (loadingIndex !== -1) {
            // Just remove the loading indicator since the function call UI already shows the result
            newMsgs.splice(loadingIndex, 1);
          }
          
          // Add error message
          newMsgs.push({
            role: 'assistant',
            content: `Error processing function result: ${error instanceof Error ? error.message : String(error)}`
          });
          
          return newMsgs;
        });
        
        // Reset states
        setPendingExecution(false);
        setMessageToExecute(null);
      }
    });
  };
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }
    
    // If there's a message with a safe command pending execution, execute it on Enter
    if (key.return) {
      // Check if we have any pending safe commands to execute
      if (messageToExecute !== null) {
        const msgIndex = messageToExecute;
        // Reset the message to execute
        setMessageToExecute(null);
        
        // Find the first safe and not executed command
        const msg = messages[msgIndex];
        if (msg?.functionCalls) {
          const callIndex = msg.functionCalls.findIndex(call => 
            call.args.isSafe && !call.executed);
          
          if (callIndex !== -1) {
            const command = msg.functionCalls[callIndex].args.command;
            // Pass the chat session if available for continuity
            executeCommand(command, msgIndex, callIndex, msg.chatSession);
            return;
          }
        }
      }
      
      // If no pending execution, process normal text input
      if (!pendingExecution && inputText.trim() !== '') {
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
          .map(msg => {
            if (msg.role === 'system') {
              return { role: 'model', parts: [{ text: msg.content }] };
            } else {
              return {
                role: msg.role === 'assistant' ? 'model' : 'user', 
                parts: [{ text: msg.content }]
              };
            }
          });
        
        // Call Gemini API
        geminiApi.sendMessage(userMessage, formattedHistory)
          .then(response => {
            // Check if response has function calls
            if (typeof response === 'object' && response.functionCalls) {
              // Store the chat session for potential ongoing function calls
              const chatSession = response.chatSession;
              
              setMessages(prev => {
                const newMsgs = [...prev];
                // Replace loading message with response that includes function calls
                newMsgs[newMsgs.length - 1] = { 
                  role: 'assistant', 
                  content: response.text,
                  functionCalls: response.functionCalls,
                  chatSession: chatSession // Store it with the message for future use
                };
                
                // Set the message index for potential execution
                setMessageToExecute(newMsgs.length - 1);
                
                return newMsgs;
              });
              
              // Update chat history with text response
              setChatHistory(prev => [
                ...prev,
                { role: 'user', parts: [{ text: userMessage }] },
                { role: 'model', parts: [{ text: response.text }] }
              ]);
            } else {
              setMessages(prev => {
                const newMsgs = [...prev];
                // Replace loading message with regular text response
                newMsgs[newMsgs.length - 1] = { 
                  role: 'assistant', 
                  content: response
                };
                return newMsgs;
              });
              
              // Update chat history with text response
              setChatHistory(prev => [
                ...prev,
                { role: 'user', parts: [{ text: userMessage }] },
                { role: 'model', parts: [{ text: response }] }
              ]);
            }
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
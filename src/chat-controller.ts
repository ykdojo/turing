import { useState } from 'react';
import { GeminiAPI } from './gemini-api.js';
import { formatMessagesForGeminiAPI, Message as FormatterMessage } from './utils/message-formatter.js';
import { executeCommand } from './services/terminal-service.js';
import { writeFile } from './services/write-file-service.js';

export type Message = FormatterMessage;

// System instruction for the Turing terminal assistant
const SYSTEM_INSTRUCTION = `You are a helpful terminal assistant in the Turing application, working in the directory: ${process.cwd()}. 

When users ask questions, assume they're asking about this project or directory unless specified otherwise. Use your knowledge of files in this directory to provide relevant information.

You have the ability to run terminal commands and write files. Always use these capabilities proactively to help users:
1. Use runTerminalCommand to execute terminal commands
2. Use writeFile to create new files or overwrite existing ones

Be proactive and take action immediately when it would help answer the user's question. Never ask for permission in your text responses. Your job is to be efficient and helpful with minimal back-and-forth. Focus on being direct and concise when responding to user queries.`;

// Get model from environment or use default (flash for speed, pro for capabilities)
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Initialize Gemini API with configured model, function calling enabled, and system instruction
const geminiApi = new GeminiAPI(MODEL, undefined, true, SYSTEM_INSTRUCTION);

export function useChatController() {
  // Start with a completely empty chat history
  const initialMessages: Message[] = [];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [pendingExecution, setPendingExecution] = useState<boolean>(false);
  const [messageToExecute, setMessageToExecute] = useState<number | null>(null);
  const [isHistoryMode, setIsHistoryMode] = useState<boolean>(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  
  // Handle action when user presses Enter
  const handleEnterKey = () => {
    // If in history mode, select the current message and exit history mode
    if (isHistoryMode && selectedMessageIndex !== null) {
      // Get the user messages
      const userMessages = messages.filter(msg => msg.role === 'user');
      const selectedMessage = userMessages[selectedMessageIndex];
      
      // Delete everything after this message and set input to the selected message
      if (selectedMessage) {
        // Find the index of the selected message in the full messages array
        const selectedMessageFullIndex = messages.findIndex(
          (msg, idx) => msg.role === 'user' && 
                       messages.slice(0, idx + 1).filter(m => m.role === 'user').length === selectedMessageIndex + 1
        );
        
        // If found, delete everything after it AND the selected message itself, then set input text
        if (selectedMessageFullIndex !== -1) {
          // Delete the selected message and all messages after it
          setMessages(messages.slice(0, selectedMessageFullIndex));
          
          // Set the input text to the selected message content
          setInputText(selectedMessage.content);
        }
      }
      
      // Exit history mode
      setIsHistoryMode(false);
      setSelectedMessageIndex(null);
      return true;
    }
    
    // Check if we have any pending safe commands to execute
    if (messageToExecute !== null) {
      const msgIndex = messageToExecute;
      // Reset the message to execute
      setMessageToExecute(null);
      
      // Find the first unsafe and not executed command
      const msg = messages[msgIndex];
      if (msg?.functionCalls) {
        const callIndex = msg.functionCalls.findIndex((call) => {
          // For runTerminalCommand, check if it's unsafe and not executed
          if (call.name === "runTerminalCommand") {
            return !call.args.isSafe && !call.executed;
          }
          // All other functions are considered already executed or safe
          return false;
        });
        
        if (callIndex !== -1) {
          const call = msg.functionCalls[callIndex];
          // Check which function to execute
          if (call.name === "runTerminalCommand") {
            const command = call.args.command;
            // Pass the chat session if available for continuity
            executeCommand(
              command, 
              msgIndex, 
              callIndex, 
              msg.chatSession,
              geminiApi,
              setMessages,
              setChatHistory,
              setPendingExecution,
              setMessageToExecute
            );
            return true; // Command execution initiated
          }
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
      const formattedHistory = formatMessagesForGeminiAPI(messages);
      
      
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
                content: response.text || "I'll process that for you.",
                functionCalls: response.functionCalls,
                chatSession: chatSession // Store it with the message for future use
              };
              
              const msgIndex = newMsgs.length - 1;
              
              // Set the message index for potential execution of unsafe commands
              setMessageToExecute(msgIndex);
              
              // Automatically execute safe commands
              const safeCallIndex = response.functionCalls.findIndex(call => {
                // For runTerminalCommand, check the isSafe flag
                if (call.name === "runTerminalCommand") {
                  return call.args.isSafe === true;
                }
                // For writeFile, always consider it safe
                if (call.name === "writeFile") {
                  return true;
                }
                // By default, consider functions unsafe
                return false;
              });
              
              if (safeCallIndex !== -1) {
                // Get the function call
                const call = response.functionCalls[safeCallIndex];
                
                // Store the command and execution details for reference
                const commandDetails = {
                  call,
                  msgIndex,
                  safeCallIndex,
                  chatSession: { ...chatSession }
                };
                
                // Use a small delay to ensure React state is updated first
                setTimeout(() => {
                  // Execute the appropriate function based on the function name
                  if (call.name === "runTerminalCommand") {
                    executeCommand(
                      call.args.command,
                      commandDetails.msgIndex,
                      commandDetails.safeCallIndex,
                      commandDetails.chatSession,
                      geminiApi,
                      setMessages,
                      setChatHistory,
                      setPendingExecution,
                      setMessageToExecute
                    );
                  } else if (call.name === "writeFile") {
                    writeFile(
                      call.args.filePath,
                      call.args.content,
                      commandDetails.msgIndex,
                      commandDetails.safeCallIndex,
                      commandDetails.chatSession,
                      geminiApi,
                      setMessages,
                      setChatHistory,
                      setPendingExecution,
                      setMessageToExecute
                    );
                  }
                }, 100);
              }
              
              return newMsgs;
            });
            
            // Update chat history with text response
            setChatHistory(prev => [
              ...prev,
              { role: 'user', parts: [{ text: userMessage }] },
              { role: 'model', parts: [{ text: response.text || "I'll process that for you." }] }
            ]);
          } else {
            setMessages(prev => {
              const newMsgs = [...prev];
              // Replace loading message with regular text response
              newMsgs[newMsgs.length - 1] = { 
                role: 'assistant', 
                content: typeof response === 'string' ? response : response.text || ''
              };
              return newMsgs;
            });
            
            // Update chat history with text response
            setChatHistory(prev => [
              ...prev,
              { role: 'user', parts: [{ text: userMessage }] },
              { role: 'model', parts: [{ text: typeof response === 'string' ? response : response.text || '' }] }
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
        
        return true; // Message sent
    }
    
    return false; // No action taken
  };

  // Navigate through messages in history mode
  const navigateHistory = (direction: 'up' | 'down') => {
    if (!isHistoryMode) return;
    
    const userMessages = messages.filter(msg => msg.role === 'user');
    if (userMessages.length === 0) return;
    
    if (selectedMessageIndex === null) {
      setSelectedMessageIndex(direction === 'up' ? userMessages.length - 1 : 0);
    } else {
      const newIndex = direction === 'up' 
        ? Math.max(0, selectedMessageIndex - 1)
        : Math.min(userMessages.length - 1, selectedMessageIndex + 1);
      setSelectedMessageIndex(newIndex);
    }
  };

  // Text input handlers
  const updateInputText = (text: string) => {
    setInputText(text);
  };

  const appendToInputText = (text: string) => {
    if (isHistoryMode) return;
    setInputText(prev => prev + text);
  };

  const backspaceInputText = () => {
    if (isHistoryMode) return;
    setInputText(prev => prev.slice(0, -1));
  };

  const toggleHistoryMode = () => {
    // Toggle history mode
    const newHistoryMode = !isHistoryMode;
    setIsHistoryMode(newHistoryMode);
    
    // If exiting history mode, clear any selection
    if (!newHistoryMode) {
      setSelectedMessageIndex(null);
      setInputText('');
    } else {
      // If entering history mode, select the most recent user message
      const userMessages = messages.filter(msg => msg.role === 'user');
      if (userMessages.length > 0) {
        setSelectedMessageIndex(userMessages.length - 1);
      }
    }
  };

  const showPreviousUserMessages = () => {
    // This function is kept for backward compatibility
    toggleHistoryMode();
  };

  return {
    messages,
    inputText,
    messageToExecute,
    pendingExecution,
    isHistoryMode,
    selectedMessageIndex,
    handleEnterKey,
    updateInputText,
    appendToInputText,
    backspaceInputText,
    showPreviousUserMessages,
    toggleHistoryMode,
    navigateHistory
  };
}
import { useState } from 'react';
import { GeminiAPI } from './gemini-api.js';
import { formatMessagesForGeminiAPI, Message as FormatterMessage } from './utils/message-formatter.js';
import { executeCommand } from './services/terminal-service.js';
import { editFile } from './services/file-edit-service.js';

export type Message = FormatterMessage;

// System instruction for the Turing terminal assistant
const SYSTEM_INSTRUCTION = `You are a helpful terminal assistant in the Turing application, working in the directory: ${process.cwd()}. Be proactive and run commands immediately when they would help answer the user's question. Never ask for permission in your text responses. Your job is to be efficient and helpful with minimal back-and-forth. Focus on being direct and concise when responding to user queries.`;

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
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number>(-1);
  
  // Handle action when user presses Enter
  const handleEnterKey = () => {
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
                // For editFile, always consider it safe
                if (call.name === "editFile") {
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
                  } else if (call.name === "editFile") {
                    editFile(
                      call.args.filePath,
                      call.args.searchString,
                      call.args.replaceString,
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

  // Text input handlers
  const updateInputText = (text: string) => {
    setInputText(text);
  };

  const appendToInputText = (text: string) => {
    setInputText(prev => prev + text);
  };

  const backspaceInputText = () => {
    setInputText(prev => prev.slice(0, -1));
  };

  const toggleHistoryMode = () => {
    // Store current input if entering history mode and input is not empty
    const currentInput = inputText;
    
    // Toggle history mode
    setIsHistoryMode(!isHistoryMode);
    
    // Reset selected message index when entering history mode
    if (!isHistoryMode) {
      const userMessageIndices = messages
        .map((msg, idx) => msg.role === 'user' ? idx : -1)
        .filter(idx => idx !== -1);
      
      // Select the most recent user message if available
      if (userMessageIndices.length > 0) {
        setSelectedMessageIndex(userMessageIndices[userMessageIndices.length - 1]);
      }
    } else if (currentInput) {
      // Restore input when exiting history mode
      setInputText(currentInput);
    }
  };
  
  const selectPreviousMessage = () => {
    if (isHistoryMode) {
      // Get indices of all user messages
      const userMessageIndices = messages
        .map((msg, idx) => msg.role === 'user' ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (userMessageIndices.length > 0) {
        // Find current index in the list of user messages
        const currentIndexPosition = userMessageIndices.indexOf(selectedMessageIndex);
        
        // Get previous message index (wrap around to end if at beginning)
        const newPosition = currentIndexPosition <= 0 
          ? userMessageIndices.length - 1 
          : currentIndexPosition - 1;
          
        setSelectedMessageIndex(userMessageIndices[newPosition]);
      }
    }
  };
  
  const selectNextMessage = () => {
    if (isHistoryMode) {
      // Get indices of all user messages
      const userMessageIndices = messages
        .map((msg, idx) => msg.role === 'user' ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (userMessageIndices.length > 0) {
        // Find current index in the list of user messages
        const currentIndexPosition = userMessageIndices.indexOf(selectedMessageIndex);
        
        // Get next message index (wrap around to beginning if at end)
        const newPosition = currentIndexPosition >= userMessageIndices.length - 1 
          ? 0 
          : currentIndexPosition + 1;
          
        setSelectedMessageIndex(userMessageIndices[newPosition]);
      }
    }
  };
  
  const useSelectedMessage = () => {
    if (isHistoryMode && selectedMessageIndex >= 0 && selectedMessageIndex < messages.length) {
      // Get selected message index and content
      const msgIndex = selectedMessageIndex;
      const selectedMessage = messages[msgIndex].content;
      
      // Calculate how many messages to keep
      // We need to find the LAST user message before this point
      // 1. Find all messages before the selected index
      // 2. Filter for user messages
      const userMessageIndices = messages
        .map((msg, idx) => idx < msgIndex && msg.role === 'user' ? idx : -1)
        .filter(idx => idx !== -1);
      
      // Find the last user message if any
      const lastUserMessageIdx = userMessageIndices.length > 0 
        ? userMessageIndices[userMessageIndices.length - 1] 
        : -1;
      
      // Keep conversation up to the last user message
      // If there are no user messages, clear all messages
      const keepUpToIndex = lastUserMessageIdx >= 0 
        ? lastUserMessageIdx + 2  // +2 to keep the last user message and AI response
        : 0;                      // No previous messages, clear all
      
      // Set input text to selected message
      setInputText(selectedMessage);
      
      // Update message list - keep only up to the calculated index
      setMessages(prevMessages => prevMessages.slice(0, keepUpToIndex));
      
      // Also update the chat history state to match
      setChatHistory(prevHistory => {
        // Calculate exact number of user-response pairs to preserve
        // This should match exactly with the messages we're keeping
        const userResponsePairs = Math.floor(keepUpToIndex / 2);
        return prevHistory.slice(0, userResponsePairs * 2);
      });
      
      // Exit history mode
      setIsHistoryMode(false);
    }
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
    toggleHistoryMode,
    selectPreviousMessage,
    selectNextMessage,
    useSelectedMessage
  };
}
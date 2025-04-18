import { useState } from 'react';
import { GeminiAPI } from './gemini-api.js';
import { formatMessagesForGeminiAPI, Message as FormatterMessage } from './utils/message-formatter.js';
import { executeCommand } from './services/terminal-service.js';

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
        const callIndex = msg.functionCalls.findIndex((call) => 
          !call.args.isSafe && !call.executed);
        
        if (callIndex !== -1) {
          const command = msg.functionCalls[callIndex].args.command;
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
              const safeCallIndex = response.functionCalls.findIndex(call => 
                call.args.isSafe);
              
              if (safeCallIndex !== -1) {
                // Run the first safe command automatically
                const command = response.functionCalls[safeCallIndex].args.command;
                // Store the command and execution details for reference
                const commandDetails = {
                  command,
                  msgIndex,
                  safeCallIndex,
                  chatSession: { ...chatSession }
                };
                
                // Use a small delay to ensure React state is updated first
                setTimeout(() => {
                  // Execute outside the React state update to avoid React batch update issues
                  executeCommand(
                    commandDetails.command,
                    commandDetails.msgIndex,
                    commandDetails.safeCallIndex,
                    commandDetails.chatSession,
                    geminiApi,
                    setMessages,
                    setChatHistory,
                    setPendingExecution,
                    setMessageToExecute
                  );
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

  return {
    messages,
    inputText,
    messageToExecute,
    pendingExecution,
    handleEnterKey,
    updateInputText,
    appendToInputText,
    backspaceInputText
  };
}
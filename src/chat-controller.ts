import { useState } from 'react';
import { exec } from 'child_process';
import { GeminiAPI } from './gemini-api.js';
import { formatMessagesForGeminiAPI, Message as FormatterMessage } from './utils/message-formatter.js';

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
        
        // Get a fresh reference to messages for safer access
        let functionName;
        
        // First try to get the function name from the cached message state
        if (messages[messageIndex]?.functionCalls?.[callIndex]?.name) {
          functionName = messages[messageIndex].functionCalls![callIndex].name;
        } else {
          // If we can't find it through the standard path (which might happen during async state updates)
          // Use a hardcoded default that's known to match our only function
          console.log("Using fallback function name");
          functionName = "runTerminalCommand";
        }
        
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
            
            const msgIndex = newMsgs.length - 1;
            
            // Set message index for potential execution of unsafe commands
            setMessageToExecute(msgIndex);
            
            // Automatically execute safe commands
            const safeCallIndex = response.functionCalls.findIndex((call: {name: string; args: {command: string; isSafe: boolean}}) => 
              call.args.isSafe);
            
            if (safeCallIndex !== -1) {
              // Run the first safe command automatically
              const command = response.functionCalls[safeCallIndex].args.command;
              // Store the command and execution details for reference
              const commandDetails = {
                command,
                msgIndex,
                safeCallIndex,
                chatSession: session // Use the current session for continuity
              };
              
              // Use a small delay to ensure React state is updated first
              setTimeout(() => {
                // Execute outside the React state update to avoid React batch update issues
                executeCommand(
                  commandDetails.command,
                  commandDetails.msgIndex,
                  commandDetails.safeCallIndex,
                  commandDetails.chatSession
                );
              }, 100);
            }
            
            return newMsgs;
          });
          
          // Update chat history - ensure we always have non-empty text
          setChatHistory(prev => [
            ...prev,
            {
              role: 'model',
              parts: [{ text: response.text || "I'll process that for you." }]
            }
          ]);
          
          // Set pending execution to false (for unsafe commands, safe ones auto-execute)
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
          
          // Update chat history - ensure we have non-empty text
          setChatHistory(prev => [
            ...prev,
            {
              role: 'model',
              parts: [{ 
                text: typeof response === 'string' 
                  ? (response || "I processed your request.") 
                  : (response.text || "I processed your request.") 
              }]
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
          
          // Try to show a more useful error message
          let errorMsg = "An error occurred while processing the command result.";
          if (error instanceof Error) {
            // For explicit errors, show the message
            errorMsg = `Error: ${error.message}`;
          } else if (typeof error === 'string') {
            errorMsg = `Error: ${error}`;
          }
          
          // Add error message
          newMsgs.push({
            role: 'assistant',
            content: errorMsg
          });
          
          return newMsgs;
        });
        
        // Reset states
        setPendingExecution(false);
        setMessageToExecute(null);
      }
    });
  };

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
          executeCommand(command, msgIndex, callIndex, msg.chatSession);
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
                    commandDetails.chatSession
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
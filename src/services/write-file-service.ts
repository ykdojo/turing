import { GeminiAPI } from '../gemini-api.js';
import fs from 'node:fs';
import path from 'node:path';
import { executeCommand } from './terminal-service.js';
import { editFile } from './file-edit-service.js';

/**
 * Function to write content to a file (create or replace)
 */
export function writeFile(
  filePath: string,
  content: string,
  messageIndex: number,
  callIndex: number,
  chatSession: any,
  geminiApi: GeminiAPI,
  setMessages: (callback: (prev: any[]) => any[]) => void,
  setChatHistory: (callback: (prev: any[]) => any[]) => void,
  setPendingExecution: (value: boolean) => void,
  setMessageToExecute: (value: number | null) => void
) {
  // Mark as pending execution
  setPendingExecution(true);
  
  try {
    // Ensure directory exists
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Check if file already exists
    const fileExists = fs.existsSync(filePath);
    const action = fileExists ? 'Updated' : 'Created';
    
    // Write content to file
    fs.writeFileSync(filePath, content, 'utf8');
    
    const result = `${action} file at ${filePath}`;
    handleResult(result, messageIndex, callIndex, chatSession, geminiApi, setMessages, 
      setChatHistory, setPendingExecution, setMessageToExecute);
  } catch (error) {
    let message = 'An unknown error occurred';
    if (error instanceof Error) {
      message = error.message;
    }
    
    const result = `Error: ${message}`;
    handleResult(result, messageIndex, callIndex, chatSession, geminiApi, setMessages, 
      setChatHistory, setPendingExecution, setMessageToExecute);
  }
}

// Helper function to handle the result and update UI state
async function handleResult(
  result: string,
  messageIndex: number,
  callIndex: number,
  chatSession: any,
  geminiApi: GeminiAPI,
  setMessages: (callback: (prev: any[]) => any[]) => void,
  setChatHistory: (callback: (prev: any[]) => any[]) => void,
  setPendingExecution: (value: boolean) => void,
  setMessageToExecute: (value: number | null) => void
) {
  // Update the message with the write result
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
      content: 'Processing write file results...',
      isLoading: true
    }
  ]);
  
  // Update chat history with function execution info
  setChatHistory(prev => [
    ...prev,
    { 
      role: 'system', 
      parts: [{ text: result }] 
    }
  ]);
  
  try {
    // Use the existing chat session if provided, otherwise create a new one
    const session = chatSession || geminiApi.startChat(chatSession);
    
    // Default function name
    let functionName = "writeFile";
    
    // First try to get the function name from the message state
    if (messageIndex >= 0 && callIndex >= 0) {
      setMessages(prev => {
        if (prev[messageIndex]?.functionCalls?.[callIndex]?.name) {
          functionName = prev[messageIndex].functionCalls![callIndex].name;
        }
        return prev;
      });
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
        const safeCallIndex = response.functionCalls.findIndex((call: {name: string; args: any}) => {
          // For runTerminalCommand, check the isSafe flag
          if (call.name === "runTerminalCommand") {
            return call.args.isSafe === true;
          }
          // For editFile or writeFile, always consider it safe
          if (call.name === "editFile" || call.name === "writeFile") {
            return true;
          }
          // By default, consider functions unsafe
          return false;
        });
        
        if (safeCallIndex !== -1) {
          // Run the first safe command automatically
          const call = response.functionCalls[safeCallIndex];
          
          // Store the command and execution details for reference
          const commandDetails = {
            call,
            msgIndex,
            safeCallIndex,
            chatSession: session // Use the current session for continuity
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
              // editFile is already imported at the top of the file
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
      
      // Update chat history - ensure we always have non-empty text
      setChatHistory(prev => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: response.text || "I've processed your file write operation." }]
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
              ? (response || "I've finished writing the file.") 
              : (response.text || "I've finished writing the file.") 
          }]
        }
      ]);
      
      // Reset states
      setPendingExecution(false);
      setMessageToExecute(null);
    }
  } catch (error) {
    console.error("Error handling file write function result:", error);
    
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
      let errorMsg = "An error occurred while processing the file write result.";
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
}
import { GeminiAPI } from '../gemini-api.js';
import fs from 'node:fs';
import { executeCommand } from './terminal-service.js';

// Function to execute a file edit operation and handle function call loop
export function editFile(
  filePath: string,
  searchString: string,
  replaceString: string,
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
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      const result = `Error: File not found at ${filePath}`;
      handleResult(result, messageIndex, callIndex, chatSession, geminiApi, setMessages, 
        setChatHistory, setPendingExecution, setMessageToExecute);
      return;
    }
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Replace content
    const newContent = content.replace(new RegExp(searchString, 'g'), replaceString);
    
    // Check if any replacements were made
    if (content === newContent) {
      const result = `No occurrences of "${searchString}" found in the file.`;
      handleResult(result, messageIndex, callIndex, chatSession, geminiApi, setMessages, 
        setChatHistory, setPendingExecution, setMessageToExecute);
      return;
    }
    
    // Write back to file
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    // Count replacements
    const replacements = (content.match(new RegExp(searchString, 'g')) || []).length;
    
    const result = `Successfully replaced ${replacements} occurrence${replacements !== 1 ? 's' : ''} of "${searchString}" with "${replaceString}" in ${filePath}`;
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
  // Update the message with the edit result
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
      content: 'Processing edit results...',
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
    let functionName = "editFile";
    
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
          // For editFile, always consider it safe
          if (call.name === "editFile") {
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
              // executeCommand is already imported at the top of the file
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
      
      // Update chat history - ensure we always have non-empty text
      setChatHistory(prev => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: response.text || "I've processed your file edit." }]
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
              ? (response || "I've finished editing the file.") 
              : (response.text || "I've finished editing the file.") 
          }]
        }
      ]);
      
      // Reset states
      setPendingExecution(false);
      setMessageToExecute(null);
    }
  } catch (error) {
    console.error("Error handling file edit function result:", error);
    
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
      let errorMsg = "An error occurred while processing the file edit result.";
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
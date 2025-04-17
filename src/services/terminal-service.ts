import { exec } from 'child_process';
import { GeminiAPI } from '../gemini-api.js';

// Function to execute a terminal command and handle function call loop
export function executeCommand(
  command: string, 
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
    
    // Update chat history with function execution info including the actual result
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
      
      // Get a fresh reference to messages for safer access
      let functionName = "runTerminalCommand"; // Default fallback
      
      // First try to get the function name from the message state
      if (messageIndex >= 0 && callIndex >= 0) {
        // Access the current messages state directly
        setMessages(prev => {
          if (prev[messageIndex]?.functionCalls?.[callIndex]?.name) {
            functionName = prev[messageIndex].functionCalls![callIndex].name;
          } else {
            // If we can't find it through the standard path (which might happen during async state updates)
            // We'll use the fallback that's already set
            console.log("Using fallback function name");
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
}
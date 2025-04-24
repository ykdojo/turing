import { exec } from 'child_process';
import { GeminiSDK } from '../gemini-sdk.js';
import { DeepseekSDK } from '../deepseek-sdk.js';
import { formatMessagesForAISDK } from '../utils/message-formatter.js';

// Define a common SDK interface that both GeminiSDK and DeepseekSDK implement
export interface LLMSDKInterface {
  getToolResults(prompt: string, history?: any[]): Promise<{
    text: string;
    steps: any[];
    toolCalls: any[];
    toolResults: any[];
    providerMetadata?: any;
  }>;
  
  sendFunctionResults(
    steps: any[],
    toolName: string,
    result: string,
    history: any[]
  ): Promise<{
    text: string;
    steps: any[];
    toolCalls: any[];
    toolResults: any[];
    providerMetadata?: any;
  }>;
}

// Define interfaces for our function calls
interface FunctionCallArgs {
  command: string;
  isSafe: boolean;
}

interface FunctionCall {
  name: string;
  args: FunctionCallArgs;
  result?: string;
  executed?: boolean;
}

// Function to execute a terminal command and handle function call loop
export function executeCommand(
  command: string | undefined, 
  messageIndex: number, 
  callIndex: number, 
  chatSession: any,
  api: LLMSDKInterface,
  setMessages: (callback: (prev: any[]) => any[]) => void,
  setChatHistory: (callback: (prev: any[]) => any[]) => void,
  setPendingExecution: (value: boolean) => void,
  setMessageToExecute: (value: number | null) => void
) {
  // Mark as pending execution
  setPendingExecution(true);
  
  // Check if command is defined
  if (!command) {
    // Handle undefined command
    setMessages(prev => {
      const newMsgs = [...prev];
      if (newMsgs[messageIndex]?.functionCalls?.[callIndex]) {
        newMsgs[messageIndex].functionCalls![callIndex].executed = true;
        newMsgs[messageIndex].functionCalls![callIndex].result = "Error: Command not specified";
      }
      return newMsgs;
    });
    
    // Reset states
    setPendingExecution(false);
    setMessageToExecute(null);
    return;
  }
  
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
        role: 'user', 
        content: `Command executed: ${command}`
      }
    ]);
    
    try {
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
      
      // Get current messages to format for AI SDK
      let messages: any[] = [];
      setMessages(prev => {
        messages = prev;
        return prev;
      });
      
      const { messages: formattedMessages } = formatMessagesForAISDK(messages);
      
      // Send function results using AI SDK format
      const response = await api.sendFunctionResults(
        chatSession || [], // Use steps from session or empty array
        functionName,
        result,
        formattedMessages
      );
      
      // Check if the response contains more function calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Format tool calls to match our expected structure
        const functionCalls: FunctionCall[] = response.toolCalls.map(call => {
          // Handle both AI SDK 'type' format and conventional format
          let toolName = 'runTerminalCommand'; // Default to our expected tool name
          let command = 'ls'; // Default to a safe command
          let isSafe = true;  // Default to safe
          
          if (call.type === 'tool-call' && call.toolName) {
            // This is the AI SDK format with a type field
            toolName = call.toolName;
            if (call.args) {
              // Extract command and safety from args
              command = call.args.command || 'ls';
              isSafe = typeof call.args.isSafe === 'boolean' ? call.args.isSafe : true;
            }
          } else {
            // Try to extract from object keys (old format)
            const firstKey = Object.keys(call)[0];
            if (firstKey && firstKey !== 'type') {
              toolName = firstKey;
              const callArgs = call[firstKey] || {};
              command = callArgs.command || 'ls';
              isSafe = typeof callArgs.isSafe === 'boolean' ? callArgs.isSafe : true;
            }
          }
          
          return {
            name: toolName,
            args: { 
              command, 
              isSafe 
            },
            executed: false
          };
        });
        
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
            functionCalls: functionCalls,
            chatSession: response.steps // Store steps for future use
          });
          
          const msgIndex = newMsgs.length - 1;
          
          // Set message index for potential execution of unsafe commands
          setMessageToExecute(msgIndex);
          
          // Automatically execute safe commands
          const safeCallIndex = functionCalls.findIndex(call => 
            call.name === 'runTerminalCommand' && call.args?.isSafe);
          
          if (safeCallIndex !== -1 && functionCalls[safeCallIndex].args?.command) {
            // Run the first safe command automatically
            const command = functionCalls[safeCallIndex].args.command;
            // Store the command and execution details for reference
            const commandDetails = {
              command,
              msgIndex,
              safeCallIndex,
              chatSession: response.steps // Use the current session for continuity
            };
            
            // Use a small delay to ensure React state is updated first
            setTimeout(() => {
              // Execute outside the React state update to avoid React batch update issues
              executeCommand(
                commandDetails.command,
                commandDetails.msgIndex,
                commandDetails.safeCallIndex,
                commandDetails.chatSession,
                api,
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
            role: 'assistant',
            content: response.text || "I'll process that for you."
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
            content: response.text
          });
          
          return newMsgs;
        });
        
        // Update chat history - ensure we have non-empty text
        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            content: response.text || "I processed your request."
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
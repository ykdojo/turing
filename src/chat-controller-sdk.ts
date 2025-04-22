import 'dotenv/config';
import { useState } from 'react';
import { GeminiSDK } from './gemini-sdk.js';
import { Message as FormatterMessage, formatMessagesForAISDK } from './utils/message-formatter.js';
import { executeCommand } from './services/terminal-service-sdk.js';
import { ToolSet, tool } from 'ai';
import { z } from 'zod';

export type Message = FormatterMessage;

// System instruction for the Turing terminal assistant
const SYSTEM_INSTRUCTION = `You are a helpful terminal assistant in the Turing application, working in the directory: ${process.cwd()}. Be proactive and run commands immediately when they would help answer the user's question. Never ask for permission in your text responses. Your job is to be efficient and helpful with minimal back-and-forth. Focus on being direct and concise when responding to user queries.`;

// Get model from environment or use default
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Convert our terminal command tool to AI SDK format with zod schema
function createTerminalCommandTool(): ToolSet {
  const terminalCommandTool = tool({
    description: "Run a terminal command on the user's system. IMMEDIATELY RUN this tool for information gathering tasks like listing files, viewing content, or checking system information. For commands like ls, pwd, cat, find, grep, etc., run them directly and set isSafe=true. For potentially destructive commands like rm, mv, format, etc., set isSafe=false. The UI will automatically handle the confirmation flow based on the isSafe flag. Never ask for permission in your text response - just set the appropriate isSafe flag and let the UI handle it. Always run appropriate commands immediately without hesitation.",
    parameters: z.object({
      command: z.string().describe("The terminal command to execute"),
      isSafe: z.boolean().describe("Whether the command is considered safe to run")
    }),
    execute: async ({ command, isSafe }) => {
      // This execute function isn't actually used - our code handles execution separately
      // But the AI SDK requires it to be defined
      return { 
        command,
        isSafe,
        result: "Execution handled separately by the UI"
      };
    }
  });

  return {
    runTerminalCommand: terminalCommandTool
  };
}

// Initialize with AI SDK patterns
const geminiSdk = new GeminiSDK(
  MODEL,
  createTerminalCommandTool(),
  'auto',
  2, // maxSteps
  SYSTEM_INSTRUCTION
);

export function useChatController() {
  // Start with a completely empty chat history
  const initialMessages: Message[] = [];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [pendingExecution, setPendingExecution] = useState<boolean>(false);
  const [messageToExecute, setMessageToExecute] = useState<number | null>(null);
  
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
            geminiSdk,
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
      
      // Format history for AI SDK
      const { messages: formattedMessages, systemPrompt } = formatMessagesForAISDK(messages);
      
      // Get response with possible tool calls
      geminiSdk.getToolResults(userMessage, formattedMessages)
        .then(response => {
          // Check if response has tool calls
          if (response.toolCalls && response.toolCalls.length > 0) {
            // Store the response steps for potential ongoing tool calls
            const steps = response.steps;
            
            // Map tool calls to our format
            const formattedToolCalls = response.toolCalls.map(call => {
              const toolName = Object.keys(call)[0];
              const args = call[toolName];
              
              return {
                name: toolName,
                args: args,
                executed: false
              };
            });
            
            setMessages(prev => {
              const newMsgs = [...prev];
              // Replace loading message with response that includes function calls
              newMsgs[newMsgs.length - 1] = { 
                role: 'assistant', 
                content: response.text || "I'll process that for you.",
                functionCalls: formattedToolCalls,
                chatSession: steps // Store steps for future use
              };
              
              const msgIndex = newMsgs.length - 1;
              
              // Set the message index for potential execution of unsafe commands
              setMessageToExecute(msgIndex);
              
              // Find tool calls marked as safe to execute automatically
              const safeToolCallIndex = formattedToolCalls.findIndex(call => 
                call.name === 'runTerminalCommand' && call.args.isSafe);
                
              if (safeToolCallIndex !== -1) {
                // Run the first safe command automatically
                const command = formattedToolCalls[safeToolCallIndex].args.command;
                // Store the command and execution details for reference
                const commandDetails = {
                  command,
                  msgIndex,
                  safeToolCallIndex,
                  chatSession: steps
                };
                
                // Use a small delay to ensure React state is updated first
                setTimeout(() => {
                  // Execute outside the React state update to avoid React batch update issues
                  executeCommand(
                    commandDetails.command,
                    commandDetails.msgIndex,
                    commandDetails.safeToolCallIndex,
                    commandDetails.chatSession,
                    geminiSdk,
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
              { role: 'user', content: userMessage },
              { role: 'assistant', content: response.text || "I'll process that for you." }
            ]);
          } else {
            // Regular text response without tool calls
            setMessages(prev => {
              const newMsgs = [...prev];
              // Replace loading message with text response
              newMsgs[newMsgs.length - 1] = { 
                role: 'assistant', 
                content: response.text
              };
              return newMsgs;
            });
            
            // Update chat history with text response
            setChatHistory(prev => [
              ...prev,
              { role: 'user', content: userMessage },
              { role: 'assistant', content: response.text }
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
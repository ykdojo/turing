export interface ToolDefinition {
  functionDeclarations: FunctionDeclaration[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

// Terminal command tool definition
export const terminalCommandTool: ToolDefinition = {
  functionDeclarations: [
    {
      name: "runTerminalCommand",
      description: "Run a terminal command on the user's system. IMMEDIATELY RUN this tool for information gathering tasks like listing files, viewing content, or checking system information. For commands like ls, pwd, cat, find, grep, etc., run them directly and set isSafe=true. For potentially destructive commands like rm, mv, format, etc., set isSafe=false. The UI will automatically handle the confirmation flow based on the isSafe flag. Never ask for permission in your text response - just set the appropriate isSafe flag and let the UI handle it. Always run appropriate commands immediately without hesitation.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The terminal command to execute"
          },
          isSafe: {
            type: "boolean",
            description: "Whether the command is considered safe to run"
          }
        },
        required: ["command", "isSafe"]
      }
    }
  ]
};

// Tool handler types
export interface ToolHandler {
  handleFunctionCall: (args: any) => Promise<string>;
}

// Terminal command tool handler (placeholder implementation)
export class TerminalCommandHandler implements ToolHandler {
  async handleFunctionCall(args: { command: string, isSafe: boolean }): Promise<string> {
    // This would be implemented to actually run terminal commands
    // For now it's just a placeholder
    if (!args.isSafe) {
      return JSON.stringify({
        output: "Command was not run because it was marked as unsafe.",
        exitCode: -1
      });
    }
    
    return JSON.stringify({
      output: `Would execute command: ${args.command}`,
      exitCode: 0
    });
  }
}

// Registry of tool handlers
export const toolHandlers: Record<string, ToolHandler> = {
  runTerminalCommand: new TerminalCommandHandler()
};

// Get all available tools
export function getAvailableTools(): ToolDefinition[] {
  return [terminalCommandTool];
}
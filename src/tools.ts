import fs from 'node:fs';
import path from 'node:path';

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

// File edit tool definition
export const fileEditTool: ToolDefinition = {
  functionDeclarations: [
    {
      name: "editFile",
      description: "Edit a file by replacing a search string with a replacement string. This operation is always considered safe and will run automatically without confirmation.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The path to the file to edit"
          },
          searchString: {
            type: "string",
            description: "The string to search for in the file"
          },
          replaceString: {
            type: "string",
            description: "The string to replace the search string with"
          }
        },
        required: ["filePath", "searchString", "replaceString"]
      }
    }
  ]
};

// File write tool definition
export const fileWriteTool: ToolDefinition = {
  functionDeclarations: [
    {
      name: "writeFile",
      description: "Create a new file or replace an existing file with the provided content. This operation is always considered safe and will run automatically without confirmation.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "The path to the file to create or replace"
          },
          content: {
            type: "string",
            description: "The content to write to the file"
          }
        },
        required: ["filePath", "content"]
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

// File edit tool handler
export class FileEditHandler implements ToolHandler {
  async handleFunctionCall(args: { filePath: string, searchString: string, replaceString: string }): Promise<string> {
    try {
      // fs is already imported at the top of the file
      const { filePath, searchString, replaceString } = args;
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return JSON.stringify({
          output: `Error: File not found at ${filePath}`,
          exitCode: 1
        });
      }
      
      // Read file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Replace content
      const newContent = content.replace(new RegExp(searchString, 'g'), replaceString);
      
      // Check if any replacements were made
      if (content === newContent) {
        return JSON.stringify({
          output: `No occurrences of "${searchString}" found in the file.`,
          exitCode: 0
        });
      }
      
      // Write back to file
      fs.writeFileSync(filePath, newContent, 'utf8');
      
      // Count replacements
      const replacements = (content.match(new RegExp(searchString, 'g')) || []).length;
      
      return JSON.stringify({
        output: `Successfully replaced ${replacements} occurrence${replacements !== 1 ? 's' : ''} of "${searchString}" with "${replaceString}" in ${filePath}`,
        exitCode: 0
      });
    } catch (error) {
      let message = 'An unknown error occurred';
      if (error instanceof Error) {
        message = error.message;
      }
      
      return JSON.stringify({
        output: `Error: ${message}`,
        exitCode: 1
      });
    }
  }
}

// File write tool handler
export class FileWriteHandler implements ToolHandler {
  async handleFunctionCall(args: { filePath: string, content: string }): Promise<string> {
    try {
      const { filePath, content } = args;
      
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
      
      return JSON.stringify({
        output: `${action} file at ${filePath}`,
        exitCode: 0
      });
    } catch (error) {
      let message = 'An unknown error occurred';
      if (error instanceof Error) {
        message = error.message;
      }
      
      return JSON.stringify({
        output: `Error: ${message}`,
        exitCode: 1
      });
    }
  }
}

// Registry of tool handlers
export const toolHandlers: Record<string, ToolHandler> = {
  runTerminalCommand: new TerminalCommandHandler(),
  editFile: new FileEditHandler(),
  writeFile: new FileWriteHandler()
};

// Get all available tools
export function getAvailableTools(): ToolDefinition[] {
  return [terminalCommandTool, fileEditTool, fileWriteTool];
}
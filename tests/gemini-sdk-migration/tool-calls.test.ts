import { describe, it, expect, jest } from '@jest/globals';

describe('GeminiSDK Migration - Tool Calls', () => {
  it('should correctly transform AI SDK tool calls to our format', () => {
    // Mock AI SDK tool call response
    const aiSdkToolCallResponse = {
      toolCalls: [
        {
          runTerminalCommand: {
            command: 'ls -la',
            isSafe: true
          }
        }
      ]
    };
    
    // Perform the transformation that we would do in the controller
    const formattedToolCalls = aiSdkToolCallResponse.toolCalls.map(call => {
      const toolName = Object.keys(call)[0];
      const args = call[toolName];
      
      return {
        name: toolName,
        args: args,
        executed: false
      };
    });
    
    // Verify the transformation produces the expected result
    expect(formattedToolCalls).toHaveLength(1);
    expect(formattedToolCalls[0]).toEqual({
      name: 'runTerminalCommand',
      args: {
        command: 'ls -la',
        isSafe: true
      },
      executed: false
    });
  });
  
  it('should handle multiple tool calls in a response', () => {
    // Mock AI SDK response with multiple tool calls
    const aiSdkToolCallResponse = {
      toolCalls: [
        {
          runTerminalCommand: {
            command: 'ls -la',
            isSafe: true
          }
        },
        {
          runTerminalCommand: {
            command: 'rm -rf /',
            isSafe: false
          }
        }
      ]
    };
    
    // Perform the transformation
    const formattedToolCalls = aiSdkToolCallResponse.toolCalls.map(call => {
      const toolName = Object.keys(call)[0];
      const args = call[toolName];
      
      return {
        name: toolName,
        args: args,
        executed: false
      };
    });
    
    // Verify multiple tool calls are transformed correctly
    expect(formattedToolCalls).toHaveLength(2);
    expect(formattedToolCalls[0].args.command).toBe('ls -la');
    expect(formattedToolCalls[0].args.isSafe).toBe(true);
    expect(formattedToolCalls[1].args.command).toBe('rm -rf /');
    expect(formattedToolCalls[1].args.isSafe).toBe(false);
  });
});
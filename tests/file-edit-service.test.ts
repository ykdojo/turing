/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';
import fs from 'node:fs';
import { editFile } from '../src/services/file-edit-service';

describe('File Edit Service', () => {
  // Test file setup
  const testFilePath = '/test/path/file.txt';
  const testFileContent = 'This is a test file with some content to replace.';
  
  // Mocked callback functions
  const mockSetMessages = jest.fn();
  const mockSetChatHistory = jest.fn();
  const mockSetPendingExecution = jest.fn();
  const mockSetMessageToExecute = jest.fn();
  
  // Mock GeminiAPI
  const mockGeminiApi = {
    sendFunctionResults: jest.fn(),
    startChat: jest.fn()
  };
  
  // Mock chat session
  const mockChatSession = {};
  
  // Use jest.spyOn for mocking instead of jest.mock
  let existsSyncSpy;
  let readFileSyncSpy;
  let writeFileSyncSpy;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create spies
    existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(testFileContent);
    writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    
    // Setup GeminiAPI mock
    mockGeminiApi.sendFunctionResults.mockResolvedValue('File edit processed successfully.');
    mockGeminiApi.startChat.mockReturnValue({});
  });
  
  afterEach(() => {
    // Restore original implementation
    existsSyncSpy.mockRestore();
    readFileSyncSpy.mockRestore();
    writeFileSyncSpy.mockRestore();
  });
  
  test('should successfully edit file with replacements', () => {
    // Arrange
    const searchString = 'content to replace';
    const replaceString = 'new content';
    
    // Act
    editFile(
      testFilePath,
      searchString,
      replaceString,
      0,
      0,
      mockChatSession,
      mockGeminiApi,
      mockSetMessages,
      mockSetChatHistory,
      mockSetPendingExecution,
      mockSetMessageToExecute
    );
    
    // Assert
    expect(existsSyncSpy).toHaveBeenCalledWith(testFilePath);
    expect(readFileSyncSpy).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      testFilePath,
      'This is a test file with some new content.',
      'utf8'
    );
    
    // Check if UI state updates were called correctly
    expect(mockSetPendingExecution).toHaveBeenCalledWith(true);
    expect(mockSetMessages).toHaveBeenCalled();
    expect(mockSetChatHistory).toHaveBeenCalled();
    
    // Check for success message containing replacement info
    const setChatHistoryCall = mockSetChatHistory.mock.calls[0][0];
    const chatHistoryUpdater = setChatHistoryCall([]); // Call the updater function with empty array
    expect(chatHistoryUpdater[0].parts[0].text).toContain('Successfully replaced 1 occurrence');
  });
  
  test('should handle file not found error', () => {
    // Arrange
    existsSyncSpy.mockReturnValue(false);
    
    // Act
    editFile(
      testFilePath,
      'search',
      'replace',
      0,
      0,
      mockChatSession,
      mockGeminiApi,
      mockSetMessages,
      mockSetChatHistory,
      mockSetPendingExecution,
      mockSetMessageToExecute
    );
    
    // Assert
    expect(existsSyncSpy).toHaveBeenCalledWith(testFilePath);
    expect(readFileSyncSpy).not.toHaveBeenCalled();
    expect(writeFileSyncSpy).not.toHaveBeenCalled();
    
    // Check for error message in chat history
    const setChatHistoryCall = mockSetChatHistory.mock.calls[0][0];
    const chatHistoryUpdater = setChatHistoryCall([]); // Call the updater function with empty array
    expect(chatHistoryUpdater[0].parts[0].text).toContain(`Error: File not found at ${testFilePath}`);
  });
  
  test('should handle when no replacements are made', () => {
    // Arrange
    const searchString = 'nonexistent text';
    const replaceString = 'replacement';
    
    // Act
    editFile(
      testFilePath,
      searchString,
      replaceString,
      0,
      0,
      mockChatSession,
      mockGeminiApi,
      mockSetMessages,
      mockSetChatHistory,
      mockSetPendingExecution,
      mockSetMessageToExecute
    );
    
    // Assert
    expect(existsSyncSpy).toHaveBeenCalledWith(testFilePath);
    expect(readFileSyncSpy).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(writeFileSyncSpy).not.toHaveBeenCalled();
    
    // Check for 'no occurrences' message
    const setChatHistoryCall = mockSetChatHistory.mock.calls[0][0];
    const chatHistoryUpdater = setChatHistoryCall([]); // Call the updater function with empty array
    expect(chatHistoryUpdater[0].parts[0].text).toContain(`No occurrences of "${searchString}" found`);
  });
  
  test('should handle exceptions during file operations', () => {
    // Arrange
    const errorMessage = 'Failed to write file';
    writeFileSyncSpy.mockImplementation(() => {
      throw new Error(errorMessage);
    });
    
    // Act
    editFile(
      testFilePath,
      'content',
      'new content',
      0,
      0,
      mockChatSession,
      mockGeminiApi,
      mockSetMessages,
      mockSetChatHistory,
      mockSetPendingExecution,
      mockSetMessageToExecute
    );
    
    // Assert
    expect(existsSyncSpy).toHaveBeenCalledWith(testFilePath);
    expect(readFileSyncSpy).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(writeFileSyncSpy).toHaveBeenCalled();
    
    // Check for error message
    const setChatHistoryCall = mockSetChatHistory.mock.calls[0][0];
    const chatHistoryUpdater = setChatHistoryCall([]); // Call the updater function with empty array
    expect(chatHistoryUpdater[0].parts[0].text).toContain(`Error: ${errorMessage}`);
  });
  
  test('should handle function call response chaining', async () => {
    // Arrange
    // Setup the mock to return a response with more function calls
    mockGeminiApi.sendFunctionResults.mockResolvedValue({
      text: "I've updated the file. Let me check the changes.",
      functionCalls: [
        {
          name: "runTerminalCommand",
          args: {
            command: "cat " + testFilePath,
            isSafe: true
          }
        }
      ]
    });
    
    // Act
    editFile(
      testFilePath,
      'content to replace',
      'new content',
      0,
      0,
      mockChatSession,
      mockGeminiApi,
      mockSetMessages,
      mockSetChatHistory,
      mockSetPendingExecution,
      mockSetMessageToExecute
    );
    
    // Wait for async operations to complete
    await new Promise(process.nextTick);
    
    // Assert
    // Verify that sendFunctionResults was called with the correct parameters
    expect(mockGeminiApi.sendFunctionResults).toHaveBeenCalledWith(
      mockChatSession,
      "editFile",
      expect.stringContaining('Successfully replaced 1 occurrence')
    );
    
    // Verify that the UI was updated with new function calls
    const setMessagesCall = mockSetMessages.mock.calls.find(
      call => typeof call[0] === 'function' && 
        call[0]([]).some((msg: any) => 
          msg.functionCalls && msg.functionCalls.length > 0 && 
          msg.functionCalls[0].name === "runTerminalCommand"
        )
    );
    
    expect(setMessagesCall).toBeDefined();
    
    // Verify that pendingExecution was set to false as the response contains a safe function
    expect(mockSetPendingExecution).toHaveBeenCalledWith(false);
  });
});
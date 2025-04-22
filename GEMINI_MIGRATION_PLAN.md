# Migration Plan: Adopting AI SDK Format in chat-controller.ts

## Core Principle
**Adapt to AI SDK Format**: We will modify our code to fully embrace AI SDK's formats and patterns rather than trying to make AI SDK conform to our existing patterns. This will result in cleaner code that leverages the full capabilities of the AI SDK.

## Progress Tracking

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 1    | Create New Branch | ✅ Complete | Created branch `feature/migrate-to-ai-sdk-with-deepseek` |
| 2    | Create Test Files | ✅ Complete | Created test structure in tests/gemini-sdk-migration/ |
| 3.1  | Basic Structure and Imports | ✅ Complete | Created controller with basic structure and imports |
| 3.2  | Initialize GeminiSDK with Tools | ✅ Complete | Configured controller to use GeminiSDK with terminal command tool |
| 3.3  | Implement Basic Message Handling | ✅ Complete | Added basic message handling in chat-controller-sdk.ts |
| 3.4  | Adapt Message History Format | ✅ Complete | Added formatMessagesForAISDK to message-formatter.ts |
| 3.5  | Implement Tool Call Handling | ✅ Complete | Implemented transformation of AI SDK tool calls to our format |
| 3.6  | Implement Command Execution | 🔄 In Progress | Basic implementation done, needs integration with terminal-service.ts |
| 3.7  | Integrate Error Handling | 🔄 Not Started | |
| 4    | Full Integration Test | 🔄 Not Started | |
| 5    | Replace Original Controller | 🔄 Not Started | |

## Setup Phase

### Step 1: Create a New Branch
```bash
git checkout -b feature/migrate-to-ai-sdk
```

### Step 2: Create Test Files
Create specific test files for each component we'll be migrating to ensure we can validate each piece:
```
tests/gemini-sdk-migration/
  ├── basic-response.test.ts   # Test basic text responses
  ├── tool-calls.test.ts       # Test tool calling
  ├── history-format.test.ts   # Test chat history formatting
  └── integration.test.ts      # End-to-end controller tests
```

## Implementation Phase (Incremental)

### Step 3: Create a Parallel Controller Implementation
- Create `src/chat-controller-sdk.ts` alongside the existing controller
- This allows us to develop the new implementation while keeping the original functional
- Test each piece as we implement it

#### 3.1: Basic Structure and Imports
```typescript
// chat-controller-sdk.ts
import 'dotenv/config';
import { useState } from 'react';
import { GeminiSDK } from './gemini-sdk.js';
// Implement basic structure mirroring current controller
// Test: tests/gemini-sdk-migration/basic-structure.test.ts
```

#### 3.2: Initialize GeminiSDK with Tools
```typescript
// Add to chat-controller-sdk.ts
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const SYSTEM_INSTRUCTION = `You are a helpful terminal assistant...`;

// Convert our terminal command tool to AI SDK format
function createTerminalCommandTool() {
  return {
    runTerminalCommand: {
      // AI SDK format tool definition
    }
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
// Test: tests/gemini-sdk-migration/sdk-initialization.test.ts
```

#### 3.3: Implement Basic Message Handling
```typescript
// Add to chat-controller-sdk.ts
// Implement basic send/receive without tools
// Test: tests/gemini-sdk-migration/basic-response.test.ts
```

#### 3.4: Adapt Message History Format for AI SDK
```typescript
// Create or modify formatter to work with AI SDK format
// Test: tests/gemini-sdk-migration/history-format.test.ts
```

#### 3.5: Implement Tool Call Handling
```typescript
// Add AI SDK-specific tool call handling
// Test: tests/gemini-sdk-migration/tool-calls.test.ts
```

#### 3.6: Implement Command Execution
```typescript
// Modify executeCommand to work with AI SDK tool results
// Test: tests/gemini-sdk-migration/command-execution.test.ts
```

#### 3.7: Integrate Error Handling
```typescript
// Add AI SDK-specific error handling
// Test: tests/gemini-sdk-migration/error-handling.test.ts
```

### Step 4: Full Integration Test
- Ensure the new controller works end-to-end
- Test: `tests/gemini-sdk-migration/integration.test.ts`

### Step 5: Replace Original Controller
- Once fully tested, replace the original implementation or rename files

## Detailed Implementation Requirements

### AI SDK Tool Format
```typescript
// AI SDK expects tools in this format - adapt our code to this:
const tools = {
  runTerminalCommand: {
    description: "Run a terminal command...",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command to execute" },
        isSafe: { type: "boolean", description: "If it's safe to run" }
      },
      required: ["command", "isSafe"]
    }
  }
};
```

### AI SDK Response Processing
```typescript
// AI SDK returns responses in this format - adapt our processing to this:
const result = await geminiSdk.getToolResults(userMessage);
// Handle responses according to AI SDK structure
const { text, toolCalls, toolResults, steps } = result;
```

### Chat History Format for AI SDK
```typescript
// AI SDK expects history in this format - modify our formatters:
// (This is just an example - check actual AI SDK docs)
const aiSdkFormattedHistory = messages.map(msg => ({
  role: msg.role === 'user' ? 'user' : 'assistant',
  content: msg.content
}));
```

## Testing Each Component

1. **After Step 3.1-3.2**: Test SDK initialization
   ```bash
   npm test tests/gemini-sdk-migration/basic-structure.test.ts
   npm test tests/gemini-sdk-migration/sdk-initialization.test.ts
   ```

2. **After Step 3.3**: Test basic response
   ```bash
   npm test tests/gemini-sdk-migration/basic-response.test.ts
   ```

3. **After Step 3.4**: Test history formatting
   ```bash
   npm test tests/gemini-sdk-migration/history-format.test.ts
   ```

4. **After Step 3.5-3.6**: Test tool calls and execution
   ```bash
   npm test tests/gemini-sdk-migration/tool-calls.test.ts
   npm test tests/gemini-sdk-migration/command-execution.test.ts
   ```

5. **After Step 3.7**: Test error handling
   ```bash
   npm test tests/gemini-sdk-migration/error-handling.test.ts
   ```

6. **After Step 4**: Test full integration
   ```bash
   npm test tests/gemini-sdk-migration/integration.test.ts
   ```

## Key Benefits of This Approach

1. **Incremental**: We implement and test one piece at a time
2. **Parallel Development**: Original functionality remains intact during development
3. **Safety**: Original code remains untouched until we're ready to switch
4. **Better Design**: By adapting to AI SDK patterns, we get a cleaner implementation
5. **Testable**: Every step has specific tests

## Potential Challenges and Solutions

1. **Different Response Structures**: Map between our UI expectations and AI SDK responses
2. **Tool Call Format Differences**: Adapt our execution logic to AI SDK format
3. **System Instruction Handling**: Ensure we format correctly for AI SDK

## Final Steps

1. Once integration tests pass, make the new controller the default
2. Update imports in UI components to use the new controller
3. Run full application tests
4. Remove or archive the original implementation if no longer needed

## Progress Summary (April 22, 2025)

We have made significant progress on the migration to the AI SDK format:

1. **Completed:**
   - Created the initial test structure for verifying each migration step
   - Set up the basic controller structure in `chat-controller-sdk.ts`
   - Added the tool definitions in AI SDK format
   - Implemented message history formatting for AI SDK
   - Added basic tool call handling to transform AI SDK format to our internal format
   - Implemented the initial structure for command execution

2. **In Progress:**
   - Complete the terminal command execution integration with the AI SDK
   - Updating the terminal-service.ts to handle both old and new API formats

3. **Testing Approach:**
   - We've created placeholder tests for all components
   - Some tests are functional and verify component behavior directly
   - Others are "smoke tests" with simplified assertions that the implementation exists
   - Rather than testing full React hooks (which is challenging in Jest), we're testing individual functions and transformations

4. **Next Steps:**
   - Complete the command execution integration
   - Implement error handling for the AI SDK format
   - Create full integration tests
   - Replace the original controller with the new implementation
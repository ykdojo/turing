# DeepSeek Streaming Implementation Plan

This document outlines the step-by-step plan for implementing streaming capabilities for DeepSeek models in the Turing project.

## Reference Files

Existing Gemini files to reference:
- `/src/gemini-sdk-streaming.ts` - Main streaming SDK implementation
- `/scripts/run-streaming-demo.sh` - Demo script for Gemini streaming
- `/scripts/streaming-demo.ts` - TypeScript demo showing streaming capabilities
- `/tests/gemini-sdk-streaming.test.ts` - Test suite for streaming functionality

Existing DeepSeek files:
- `/src/deepseek-sdk.ts` - Non-streaming DeepSeek SDK implementation

## Implementation Steps

### Phase 1: Basic DeepSeek Streaming SDK Implementation

1. Create the `deepseek-sdk-streaming.ts` file
   - Adapt `gemini-sdk-streaming.ts` for DeepSeek
   - Replace `google()` with `deepseek()`
   - Update environment variable names from `GEMINI_API_KEY` to `DEEPSEEK_API_KEY`
   - Keep the same API structure for easy switching between providers

**Testing Step 1:** Create a basic test file `tests/deepseek-sdk-streaming.test.ts`
- Test the constructor and API key validation
- Test that the class exposes the expected methods
- Include both structural tests (which don't require API keys) and functional tests that make actual API calls
- For API-dependent tests, follow the Gemini pattern of checking for API key presence and skipping tests if not available
- Add a reasonable timeout for API-dependent tests (30-45 seconds)

### Phase 2: Implement Basic Streaming Demo

1. Create `deepseek-streaming-demo.ts` in the scripts directory
   - Adapt from `streaming-demo.ts`
   - Import from the new DeepSeek streaming SDK
   - Start with just the text streaming demo, not tool calling

2. Create `run-deepseek-streaming-demo.sh` 
   - Adapt from `run-streaming-demo.sh`
   - Update environment variable checking from `GEMINI_API_KEY` to `DEEPSEEK_API_KEY`
   - Support reading the API key from a .env file like the Gemini script
   - Update compilation steps to target DeepSeek SDK file
   - Use the same error handling for missing API keys

**Testing Step 2:** Test the basic streaming functionality manually
- Run the shell script to test text streaming
- Verify text chunks are being received and displayed incrementally

### Phase 3: Implement Tool Calling with Streaming

1. Expand the demo to include tool calling capabilities
   - Add the calculator tool example
   - Implement the tool call streaming functionality

2. Implement comprehensive test cases
   - Test tool calling with streaming
   - Test error handling scenarios
   - Test static helper methods for stream consumption

**Testing Step 3:** Test the complete implementation
- Test that tool calls are properly streamed
- Test that tool results are correctly processed and returned
- Verify that error handling works as expected

## Environment Setup

The implementation will require:
- A valid DeepSeek API key (`DEEPSEEK_API_KEY`) set in one of these ways:
  - In a `.env` file at the project root (preferred for development)
  - As an environment variable
- The `@ai-sdk/deepseek` package (already installed per package.json)
- The core `ai` package with `streamText` capability (already installed)
- An approach to API key handling consistent with the existing Gemini implementation

Note that both tests and demo scripts should check for the presence of the API key and handle its absence gracefully (skip tests or show helpful error messages).

## Testing Strategy

### Incremental Implementation and Testing

Follow an incremental approach to minimize potential issues:

1. First implement and test just the base DeepSeek streaming SDK class structure
   - Test class instantiation and basic properties before implementing streaming methods
   - Ensure environment variable handling works correctly

2. Next implement and test basic text streaming without tools
   - Implement the `streamMessage` method
   - Create a simple demo that just streams text responses
   - Test with simple, predictable prompts

3. Finally implement and test tool calling with streaming
   - Implement the `streamToolCalls` method
   - Add tool calling to the demo
   - Test with increasingly complex tool use cases

### Test Types for Each Phase

For each implementation phase:
1. Unit tests for SDK functionality 
2. Manual testing of the demo script
3. Integration tests for full end-to-end functionality

### Test Coverage

Ensure that all tests check:
- Proper error handling for missing API keys
- Correct streaming behavior for text responses
- Proper tool calling and result handling
- Compatibility with the existing DeepSeek non-streaming implementation

### API Key Management in Tests

- Using real API calls in tests is acceptable and expected in this codebase
- Follow the pattern already established in Gemini tests: check if API key exists and skip tests gracefully if not available
- When running tests in CI/CD, ensure API keys are properly managed as secrets
- For local development, use a .env file that is not committed to the repository
- Include clear instructions in the test files about API key requirements
- Add appropriate timeouts for tests making API calls (30-45 seconds is typical)

## Future Enhancements

After basic implementation:
1. Add support for additional DeepSeek model parameters
2. Implement multi-step tool calling with streaming
3. Add streaming support in the chat UI terminal interface
4. Create examples demonstrating streaming with system instructions
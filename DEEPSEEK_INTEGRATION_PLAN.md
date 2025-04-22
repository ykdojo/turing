# DeepSeek Integration Plan

This document outlines the plan for integrating DeepSeek models into the Turing project.

## Implementation Status

### Phase 1-3: DeepSeek Streaming SDK ✅ COMPLETED

- ✅ Created streaming SDK for DeepSeek with compatibility with Gemini SDK structure
- ✅ Implemented and tested tool calling capabilities
- ✅ Built and tested demo scripts
- ✅ Added comprehensive test coverage
- ✅ Fixed module export/import structure to ensure compatibility with ESM

## Current Focus: Chat Controller SDK Integration

### Phase 4: Integrate with Chat Controller SDK ⚠️ PLANNED

The current Chat Controller SDK (`chat-controller-sdk.ts`) uses Gemini exclusively. We need to update it to support DeepSeek models as well.

1. ⚠️ Create a model provider abstraction layer
   - ⚠️ Refactor controller to accept a model provider parameter
   - ⚠️ Support switching between Gemini and DeepSeek
   - ⚠️ Ensure the API signatures remain compatible

2. ⚠️ Update environment variable handling
   - ⚠️ Support `MODEL_PROVIDER` environment variable (values: "gemini", "deepseek")
   - ⚠️ Support model name environment variables for each provider
   - ⚠️ Add fallback to default provider (Gemini)

3. ⚠️ Ensure tool compatibility
   - ⚠️ Verify terminal command tool works correctly with DeepSeek
   - ⚠️ Test function call format compatibility
   - ⚠️ Ensure error handling is consistent across providers

4. ⚠️ Update chat UI components
   - ⚠️ Add provider selection UI (if needed)
   - ⚠️ Pass provider selection to controller

### Testing Requirements

1. ⚠️ Create tests for multi-provider support
   - ⚠️ Test provider switching
   - ⚠️ Test with DeepSeek v3 model
   - ⚠️ Verify tool calling with both providers

2. ⚠️ Manual testing
   - ⚠️ Test chat interface with both providers
   - ⚠️ Verify terminal command execution

## Implementation Details

### Key Components to Modify

1. `chat-controller-sdk.ts`:
   - Currently initializes GeminiSDK directly
   - Needs to be updated to support both Gemini and DeepSeek

2. Environment variables:
   - Add `MODEL_PROVIDER=deepseek` option
   - Support `DEEPSEEK_MODEL` for model selection

3. Test cases:
   - Update existing tests to work with both providers
   - Add specific tests for DeepSeek integration
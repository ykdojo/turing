# Turing AI Integration Todo List

## Next Priority: Common API Interface
- [ ] Create a unified API interface for multiple AI models
  - [ ] Design an abstract base class that can be implemented by different model providers
  - [ ] Move Gemini implementation to use this interface
  - [ ] Create DeepSeek implementation using this interface
  - [ ] Update chat UI to work with the common interface
  - [ ] Add model selection capability

## Model Integration Testing
- [ ] DeepSeek via Ollama (local)
  - [ ] Create test file for Ollama API integration
  - [ ] Test with single prompt file

- [ ] DeepSeek via Cloudflare
  - [ ] Create test file for Cloudflare API integration
  - [ ] Test with single prompt file

- [x] Google Gemini 2.0 Flash
  - [x] Create test file for Gemini API integration
  - [x] Test with single prompt file

## Integration into Terminal UI
- [ ] Refactor `api.ts` to support the model
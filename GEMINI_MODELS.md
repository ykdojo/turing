# Gemini Model Names

## Working Models (Verified)
- `gemini-2.0-flash` - Gemini 2.0 Flash (alias for gemini-2.0-flash-001, supports function calling)
- `gemini-2.0-flash-lite` - Lighter version of Gemini 2.0 Flash (less likely to hit rate limits, weaker function calling)
- `gemini-2.0-flash-thinking-exp-01-21` - Gemini 2.0 Flash with thinking capabilities (no function calling support)
- `gemini-2.5-flash-preview-04-17` - Gemini 2.5 Flash Preview (faster model with higher quota, supports function calling)

## Non-Working Models
- `gemini-2.5-pro-preview-03-25` - No free quota tier available
- `gemini-2.5.pro-exp-03-25` - Incorrect model name format (dot instead of hyphen)
- `gemini-2.5-pro-exp-03-25` - Deprecated (replaced by gemini-2.5-flash-preview-04-17)

## Notes
- For Gemini 2.5 models, prefer the flash-preview version for faster responses and higher quota limits
- Model names use hyphens, not dots, between version components
- Function calling works with Gemini 2.0 Flash and Gemini 2.5 Flash models
- Model availability and naming may change over time (Last verified: 2025-04-21)
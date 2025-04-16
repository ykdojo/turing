# Gemini Model Names

## Working Models (Verified)
- `gemini-2.0-flash` - Gemini 2.0 Flash (alias for gemini-2.0-flash-001, supports function calling)
- `gemini-2.0-flash-lite` - Lighter version of Gemini 2.0 Flash (less likely to hit rate limits, weaker function calling)
- `gemini-2.0-flash-thinking-exp-01-21` - Gemini 2.0 Flash with thinking capabilities (no function calling support)
- `gemini-2.5-pro-exp-03-25` - Gemini 2.5 Pro Experimental (free tier access, supports function calling)

## Non-Working Models
- `gemini-2.5-pro-preview-03-25` - No free quota tier available
- `gemini-2.5.pro-exp-03-25` - Incorrect model name format (dot instead of hyphen)

## Notes
- For Gemini 2.5 Pro models, use the experimental versions (`-exp-`) for free tier access
- Model names use hyphens, not dots, between version components
- Function calling works with Gemini 2.0 Flash and Gemini 2.5 Pro models
- Model availability and naming may change over time (Last verified: 2025-04-13)
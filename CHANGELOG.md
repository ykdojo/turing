# Changelog

## [2025-04-15] - Latest

### Changed
- Refactored tool definitions into separate `tools.ts` file for better organization
- Updated tests to consistently use `gemini-2.0-flash` model to avoid rate limits

## [2025-04-14]

### Added
- Configurable model selection via `GEMINI_MODEL` environment variable
- Support for switching between `gemini-2.0-flash` (faster) and `gemini-2.5-pro-exp-03-25` (more capable)
- Default model now set to `gemini-2.0-flash` for better performance
- Updated `.env.example` with model configuration example

### Changed
- Refactored chat controller to use environment-based model configuration
# Changelog

## [2025-04-17] - Latest

### Added
- New file editing tool that allows replacing text in files
- Implemented file edit service for safe file editing operations
- File edits are always considered safe and run automatically

### Fixed
- Updated UI to properly display file edit operations with appropriate fields
- Improved safety checks to ensure file editing operations are always treated as safe
- Enhanced UI to show different information based on function type
- Added jsxFragmentFactory to TypeScript configuration to support JSX fragments
- Updated code to use explicit React.Fragment instead of shorthand syntax

## [2025-04-16]

### Fixed
- Improved system instructions to encourage proactive command execution without asking for permission

## [2025-04-15]

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
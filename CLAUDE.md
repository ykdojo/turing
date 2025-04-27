# Important Reminders for Claude

- Never add a co-author like "Claude Code" to commits
- Never add "🤖 Generated with [Claude Code](https://claude.ai/code)" to commit messages
- GitHub Desktop can be opened with the terminal command `github`
- Always push (`git push`) after commits to ensure changes are saved to the remote repository
- Run tests before committing any changes with `npm test`
- For Gemini function calling, always use mode "AUTO" (not "ANY") in the toolConfig
- For DeepSeek streaming implementation, follow the step-by-step plan in `DEEPSEEK_STREAMING_PLAN.md`
- Using real API calls in tests is acceptable and expected for Gemini - follow the pattern in the Gemini tests that checks for API key presence and skips tests if not available
- For DeepSeek tests, always use it.skip to skip tests by default, regardless of API key availability
- Never implement mocking in tests without asking for approval first
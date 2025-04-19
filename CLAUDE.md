# Important Reminders for Claude

- Never add a co-author like "Claude Code" to commits
- Never add "🤖 Generated with [Claude Code](https://claude.ai/code)" to commit messages
- GitHub Desktop can be opened with the terminal command `github`
- Always push (`git push`) after commits to ensure changes are saved to the remote repository
- Run tests before committing any changes with `npm test`
- Use `npm run test` to verify Gemini API functionality (tests pass with explicit model name requirement)
- For Gemini function calling, always use mode "AUTO" (not "ANY") in the toolConfig
- Never implement mocking or simulations without asking for approval first
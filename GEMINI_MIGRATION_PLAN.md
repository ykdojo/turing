# AISDK Migration Plan

## 1. Overview

This document outlines a simple, step-by-step plan for migrating the Turing application from direct API implementations to SDK-based implementation. The goal is to eliminate duplication and standardize on the SDK approach.

## Migration Progress Tracker

| Component | Original File | SDK File | Status |
|-----------|--------------|----------|--------|
| Chat Controller | chat-controller.ts | chat-controller-sdk.ts | ✅ Complete |
| Chat UI | chat-ui.tsx | chat-ui-sdk.tsx | ✅ Complete |
| Chat CLI | chat-cli.tsx | chat-cli-sdk.tsx | ✅ Complete |
| Terminal Service | terminal-service.ts | terminal-service-sdk.ts | ✅ Complete |
| Gemini API | gemini-api.ts | gemini-sdk.ts | ✅ Complete |

Legend:
- ⏳ Pending: Not started
- 🔄 In Progress: Import updates in progress
- ✅ Complete: Original file removed, all imports updated

## 2. Current Status

Migration completed successfully! The codebase now uses only the SDK-based implementations:
- All original non-SDK files have been removed
- All imports have been updated to reference SDK versions
- All tests have been updated and are passing

The project now standardizes on the SDK approach for all components.

## 3. Migration Steps

### Step 1: Identify Files to Remove

Non-SDK files to remove (already have SDK replacements):
- `src/chat-controller.ts` → `src/chat-controller-sdk.ts`
- `src/chat-ui.tsx` → `src/chat-ui-sdk.tsx`
- `src/chat-cli.tsx` → `src/chat-cli-sdk.tsx`
- `src/services/terminal-service.ts` → `src/services/terminal-service-sdk.ts`
- `src/gemini-api.ts` → `src/gemini-sdk.ts`

### Step 2: Update Import References

Files that import non-SDK versions need to be updated:

1. Check for imports of `chat-controller.ts`:
   ```bash
   grep -r "from.*chat-controller" --include="*.ts" --include="*.tsx" src/
   ```

2. Check for imports of `chat-ui.tsx`:
   ```bash
   grep -r "from.*chat-ui[^-]" --include="*.ts" --include="*.tsx" src/
   ```

3. Check for imports of `terminal-service.ts`:
   ```bash
   grep -r "from.*terminal-service[^-]" --include="*.ts" --include="*.tsx" src/
   ```

4. Check for imports of `gemini-api.ts`:
   ```bash
   grep -r "from.*gemini-api" --include="*.ts" --include="*.tsx" src/
   ```

5. Check for imports of `chat-cli.tsx`:
   ```bash
   grep -r "from.*chat-cli[^-]" --include="*.ts" --include="*.tsx" src/
   ```

For each file with imports, update them to reference the SDK version.

### Step 3: Update Test Files

1. Keep only SDK-compatible tests:
   - Review and possibly remove redundant test files once migration is complete
   - Ensure remaining tests work with the SDK implementation

2. Update test imports to reference the SDK files.

### Step 4: Clean up Scripts

Check and update any scripts that might be using non-SDK versions:
```bash
grep -r "from.*gemini-api\|from.*chat-controller[^-]\|from.*terminal-service[^-]" --include="*.ts" scripts/
```

### Step 5: Verify Functionality

After each change:
1. Run typechecking: `npm run typecheck`
2. Run tests: `npm test`
3. Test basic functionality manually

## 4. Implementation Approach

To minimize risk, implement changes incrementally:

1. Focus on one file or small group of related files at a time
2. For each file targeted for migration:
   - Update all imports to reference the SDK version
   - Run typechecking and relevant tests
   - Remove the original non-SDK file only after verifying imports work
   - Run tests again to confirm removal doesn't break anything

This incremental approach allows for easier troubleshooting and reduces the risk of breaking multiple components simultaneously.

## 5. Future Considerations (Optional)

After successfully migrating to SDK versions, the team might consider:

### Rename SDK Files (Remove "-sdk" Suffix)

This is an optional cleanup step that can be done after the migration is complete and stable:

1. Rename SDK files to standard names:
   - `src/chat-controller-sdk.ts` → `src/chat-controller.ts`
   - `src/chat-ui-sdk.tsx` → `src/chat-ui.tsx`
   - `src/chat-cli-sdk.tsx` → `src/chat-cli.tsx`
   - `src/services/terminal-service-sdk.ts` → `src/services/terminal-service.ts`
   - Keep `src/gemini-sdk.ts` as is (different naming pattern)

2. Update all imports of SDK files to reference the renamed files.

3. Test thoroughly after each rename.
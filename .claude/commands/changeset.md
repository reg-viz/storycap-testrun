---
allowed-tools: Bash(git:*), Bash(pnpm:*), Edit, Write, Read, Grep, Glob
argument-hint: [patch|minor|major] (optional)
description: Analyze changes and create a detailed changeset with code examples
---

## Context

Current branch: !`git branch --show-current`

Changed files:
!`git diff --name-status main...HEAD`

## Task

Analyze the current branch changes and create a comprehensive changeset:

### 1. Change Analysis

First, I'll analyze all changed files to understand the scope and nature of changes:

- **Package source changes**: Check if any TypeScript/JavaScript files in `packages/` have been modified
- **Configuration changes**: Detect updates to build, lint, format, or project configuration
- **Documentation changes**: Identify changes to README, docs, or examples
- **Dependency changes**: Check for package.json or lock file modifications

### 2. API Impact Detection

For package source code changes in `packages/storycap-testrun/src/`:

- Compare exported functions, types, and classes between main and current branch
- Identify new APIs, modified function signatures, or removed exports
- Detect potential breaking changes by analyzing:
  - Function parameter changes
  - Return type modifications
  - Removed or renamed exports
  - Type definition changes

### 3. Version Type Recommendation

Based on the analysis, recommend version type:

- **Major (breaking)**: API removals, signature changes, breaking configuration changes
- **Minor (feature)**: New APIs, new features, non-breaking additions
- **Patch (fix)**: Bug fixes, documentation updates, internal improvements

### 4. Code Example Generation

For new or changed APIs, generate relevant usage examples:

```typescript
// Example for new screenshot options
import { screenshot } from 'storycap-testrun';

await screenshot(page, {
  fullPage: true,
  mask: ['.dynamic-content'],
  animations: 'disabled',
});
```

### 5. User Confirmation

If no version type is provided as argument ($1):

- Present the analysis summary
- Show recommended version type with reasoning
- Ask user to confirm or override the recommendation
- Validate the selected version type (patch/minor/major)

### 6. Changeset Creation

Create a comprehensive changeset that includes:

**Summary**: Clear, concise description of what changed and why

**Breaking Changes** (if major version):

- List all breaking changes with migration guidance
- Include before/after code examples

**New Features** (if minor version):

- Document new APIs or capabilities
- Provide usage examples

**Bug Fixes/Improvements**:

- List fixed issues or improvements
- Reference issue numbers if available

**Migration Guide** (if needed):

- Step-by-step migration instructions
- Code transformation examples

### Example Output Format

```markdown
---
'storycap-testrun': patch
---

## Summary

Migrate Prettier configuration from package.json to dedicated prettier.config.js file for better maintainability and consistency with project standards.

## Changes

### Configuration Updates

- **Prettier**: Moved configuration from `package.json` to `prettier.config.js`
- **Renovate**: Migrated from `renovate.json` to `renovate.json5` for better commenting support

### Examples

- Added Storybook v8 React example for testing compatibility
- Updated v7 example configuration

## Impact

This is a maintenance update with no API changes. All existing functionality remains unchanged.

## Migration

No migration required for users of the library. This change only affects the development environment.
```

Please analyze the current changes and create an appropriate changeset. If a version type argument was provided ($1), use it directly. Otherwise, recommend a version type and ask for confirmation before proceeding.

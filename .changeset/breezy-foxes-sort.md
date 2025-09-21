---
'@storycap-testrun/internal': major
'@storycap-testrun/browser': major
'@storycap-testrun/node': major
---

# 🚀 storycap-testrun v2.0.0 - Major Release

## ✨ New Features

### @storycap-testrun/browser

- **Added support for `@storybook/addon-vitest`**
  - New Vitest plugin available via `/vitest-plugin` export
  - Enables visual testing in browser-based Vitest environments
  - Maintains compatibility with existing test runners

## 📦 Package Restructuring

### @storycap-testrun/node

- **Official successor to the deprecated `storycap-testrun` package**
  - Dedicated support for `@storybook/test-runner`
  - Optimized for Node.js environments

### @storycap-testrun/internal

- **Core utilities shared across packages**
  - Improved internal APIs for better maintainability
  - Optimized common functionality for browser and Node.js environments

## 💥 Breaking Changes

- **Deprecated**: `storycap-testrun` package (migrate to `@storycap-testrun/node`)
- **Dropped support for Storybook v7** (requires v8+)
- **Changed `postCapture` hook signature** (simplified from `ScreenshotImage` to `filepath`)
- **Removed `output.dry` option**

## 📚 Migration

See [MIGRATION.md](https://github.com/reg-viz/storycap-testrun/blob/main/MIGRATION.md) for detailed migration instructions from v1 to v2.

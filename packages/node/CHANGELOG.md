# @storycap-testrun/node

## 2.1.1

### Patch Changes

- Updated dependencies []:
  - @storycap-testrun/internal@2.1.1

## 2.1.0

### Minor Changes

- [#248](https://github.com/reg-viz/storycap-testrun/pull/248) [`96b0fb9`](https://github.com/reg-viz/storycap-testrun/commit/96b0fb9936a0c0bdf7aea139addd381bfcd6b0cb) Thanks [@wadackel](https://github.com/wadackel)! - Add per-story image options and fix viewport/fullPage behavior in vitest browser mode.

  **Per-story image options**: `fullPage`, `omitBackground`, and `scale` can now be set per-story via `parameters.screenshot`, overriding the global defaults.

  ```js
  export default {
    parameters: {
      screenshot: {
        fullPage: false,
      },
    },
  };
  ```

  **Viewport fix**: Added `viewport` option to the storycap plugin. This controls the screenshot capture dimensions, bypassing vitest's internal iframe scaling that previously caused screenshots to be captured at incorrect sizes.

  ```js
  storycap({
    viewport: { width: 1280, height: 720 },
  });
  ```

  **Full-page capture**: `fullPage: true` (default) now correctly captures content that extends beyond the viewport by scrolling through the iframe and stitching the results. `fullPage: false` captures only the viewport area.

### Patch Changes

- Updated dependencies [[`96b0fb9`](https://github.com/reg-viz/storycap-testrun/commit/96b0fb9936a0c0bdf7aea139addd381bfcd6b0cb)]:
  - @storycap-testrun/internal@2.1.0

## 2.0.0

### Major Changes

- [#155](https://github.com/reg-viz/storycap-testrun/pull/155) [`59f4147`](https://github.com/reg-viz/storycap-testrun/commit/59f414728cf656df66063160c25489b44b3768d2) Thanks [@wadackel](https://github.com/wadackel)! - # 🚀 storycap-testrun v2.0.0 - Major Release

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

### Patch Changes

- Updated dependencies [[`59f4147`](https://github.com/reg-viz/storycap-testrun/commit/59f414728cf656df66063160c25489b44b3768d2)]:
  - @storycap-testrun/internal@2.0.0

## 2.0.0-canary.0

### Major Changes

- [#155](https://github.com/reg-viz/storycap-testrun/pull/155) [`59f4147`](https://github.com/reg-viz/storycap-testrun/commit/59f414728cf656df66063160c25489b44b3768d2) Thanks [@wadackel](https://github.com/wadackel)! - # 🚀 storycap-testrun v2.0.0 - Major Release

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

### Patch Changes

- Updated dependencies [[`59f4147`](https://github.com/reg-viz/storycap-testrun/commit/59f414728cf656df66063160c25489b44b3768d2)]:
  - @storycap-testrun/internal@2.0.0-canary.0

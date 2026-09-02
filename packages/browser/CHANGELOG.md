# @storycap-testrun/browser

## 3.0.1

### Patch Changes

- [#300](https://github.com/reg-viz/storycap-testrun/pull/300) [`42fafdb`](https://github.com/reg-viz/storycap-testrun/commit/42fafdb4e4942e6c7f5be07e7663af4818143a04) Thanks [@re-taro](https://github.com/re-taro)! - Capture content wider than the viewport in full-page screenshots

  `fullPage: true` only stitched vertically, so content wider than the viewport — horizontally scrollable tables, lists, and similar layouts — was silently cropped to the viewport width. Full-page capture now tiles both axes: it scrolls horizontally as well, and stitches the chunks row by row, producing images sized to the content's full `scrollWidth` x `scrollHeight`. Vertical-only content produces byte-identical output to the previous behavior, and `deviceScaleFactor` other than 1 keeps working.

- Updated dependencies []:
  - @storycap-testrun/internal@3.0.1

## 3.0.0

### Major Changes

- [#288](https://github.com/reg-viz/storycap-testrun/pull/288) [`d2769c0`](https://github.com/reg-viz/storycap-testrun/commit/d2769c05e6aecc779959f0a51a4b45dbc84cfe06) Thanks [@wadackel](https://github.com/wadackel)! - Drop support for Node.js 20

  Node.js 20 reached end-of-life on 2026-04-30. All three packages now declare
  `engines.node: ">=22"` and CI runs against Node.js 22 and 24 only.

### Patch Changes

- [#292](https://github.com/reg-viz/storycap-testrun/pull/292) [`2b6b929`](https://github.com/reg-viz/storycap-testrun/commit/2b6b929d70bcf0d53ca1e8b27759136e42069f4d) Thanks [@wadackel](https://github.com/wadackel)! - Capture the full image in configurations that were silently cropped

  Three cases produced a damaged screenshot without raising anything:

  - A `viewport` option larger than the Playwright context viewport. `fullPage: false` was truncated to the context size, and the stitched full-page image gained black bands.
  - A `deviceScaleFactor` other than 1. The stitched full-page image came back at CSS-pixel dimensions with its right and bottom cropped away, while every other capture path was scaled correctly.
  - Content whose height is not a whole multiple of the viewport height. The last stitched chunk repeated the previous one and the real bottom of the page never appeared.

  If you use a `viewport` that differs from the Playwright context viewport, or a `deviceScaleFactor` other than 1, your screenshots change with this release and need a new baseline.

  Capturing now resizes the Playwright context and restores it afterwards. A context configured with `viewport: null` is the exception: Playwright cannot turn emulation back off, so the page keeps the configured size for the rest of the run.

- [#291](https://github.com/reg-viz/storycap-testrun/pull/291) [`e7a84b9`](https://github.com/reg-viz/storycap-testrun/commit/e7a84b9c0206d4f9847dabe8db07480ce4916897) Thanks [@wadackel](https://github.com/wadackel)! - Stop inlining Vitest's type surface into the published declarations

  `dist/index.d.mts` and `dist/index.d.cts` shrink from about 1.1 MB to 2.5 kB; the
  types are now imported from `vitest` and `vitest/browser` instead of being copied
  in. The exported API is unchanged.

- Updated dependencies [[`d2769c0`](https://github.com/reg-viz/storycap-testrun/commit/d2769c05e6aecc779959f0a51a4b45dbc84cfe06), [`2b6b929`](https://github.com/reg-viz/storycap-testrun/commit/2b6b929d70bcf0d53ca1e8b27759136e42069f4d)]:
  - @storycap-testrun/internal@3.0.0

## 2.1.1

### Patch Changes

- [#267](https://github.com/reg-viz/storycap-testrun/pull/267) [`819f60e`](https://github.com/reg-viz/storycap-testrun/commit/819f60ec181c85dcfd8d7d29d723f2d1226a07eb) Thanks [@wadackel](https://github.com/wadackel)! - Fix bundled `.d.mts` / `.d.cts` emitting `vitestStorycapPluginOptions` (the default export of `@storycap-testrun/browser/vitest-plugin`) as a type-only export, which caused `TS1362: cannot be used as a value because it was exported using 'export type'` in TypeScript consumers using `import storycap from "@storycap-testrun/browser/vitest-plugin"` from a `vitest.config.ts` (issue [#266](https://github.com/reg-viz/storycap-testrun/issues/266)).

  The browser package build is now split into per-entry tsdown configurations (`tsdown.config.ts` with `defineConfig` array) so the upstream `rolldown-plugin-dts` shared-chunk re-export bug — which incorrectly tagged runtime values with the `type` modifier in the shared `index-XXXX.d.mts` chunk — is avoided. Runtime output is unchanged.

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

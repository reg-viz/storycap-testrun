<h1 align="center">@storycap-testrun/browser</h1>
<p align="center">
    <a href="https://github.com/reg-viz/storycap-testrun/actions/workflows/ci.yaml?query=branch%3Amain"><img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/reg-viz/storycap-testrun/ci.yaml?branch=main&style=flat-square&logo=GitHub%20Actions&logoColor=white"></a>
    <a href="https://www.npmjs.com/package/@storycap-testrun/browser"><img alt="NPM Version" src="https://img.shields.io/npm/v/%40storycap-testrun%2Fbrowser?style=flat-square&logo=white"></a>
    <a href="https://github.com/reg-viz/storycap-testrun/blob/main/LICENSE"><img src="https://img.shields.io/github/license/reg-viz/storycap-testrun?label=license&style=flat-square" alt="MIT LICENSE" /></a>
</p>
<p align="center">Screenshot capture for Storybook addon-vitest - Provides stable visual testing functionality and Vitest plugin for Storybook stories running in browser environments.</p>

---

**@storycap-testrun/browser** brings reliable visual testing to [`@storybook/addon-vitest`][storybook-addon-vitest] with the same stability approach as [storycap][storycap], optimized for Vitest browser environments :camera:

## Why `@storycap-testrun/browser`?

[`@storybook/addon-vitest`][storybook-addon-vitest] enables running Storybook tests directly in the browser environment. While the underlying `@vitest/browser` provides basic screenshot functionality, it lacks the specialized features needed for reliable visual regression testing:

**Limited visual testing capabilities:**

- Basic screenshot API without stability detection
- No automatic waiting for rendering completion
- Fixed file paths with limited configuration options
- No built-in handling for dynamic content or animations
- Missing retry mechanisms for flaky captures

`@storycap-testrun/browser` enhances the basic functionality with production-ready features:

**Stability and reliability:**

- **Intelligent waiting**: Automatically detects when rendering is truly complete using CDP metrics
- **Hash verification**: Ensures screenshot consistency through multiple capture comparison
- **Flaky prevention**: Built-in masking and removal for dynamic content

**Developer experience:**

- **Flexible file management**: Full control over screenshot paths and naming conventions
- **Story-level configuration**: Per-story parameters for skip, delay, mask, and remove
- **Vitest plugin**: Seamless integration with Vitest's configuration and lifecycle

**Performance optimizations:**

- **Metrics monitoring**: Uses Chrome DevTools Protocol for efficient stability detection (Chromium)
- **Smart retries**: Configurable retry logic that minimizes unnecessary captures
- **Browser-native execution**: Screenshots captured directly in the test environment without external automation

This makes it ideal for teams who need more than basic screenshots - providing the reliability and flexibility required for production visual regression testing workflows.

### Features

- High stability checks for rendering content
- Accurate waiting for Play Function
- Customization before and after screenshot capture using Hooks
- Masking of unstable elements
- Removal of unstable elements
- Skipping of unstable elements
- Easy setup with Vitest plugin
- Integration with Storybook addon-vitest

### Requirements

- Vitest browser mode with Playwright provider
- `@storybook/addon-vitest` setup

### Limitations

- **Metrics monitoring limited to Chromium browsers**
  - Full stability checks work only with Chromium-based browsers (Chrome, Edge, etc.)
  - **Fallback**: Other browsers use hash verification only (still effective, but slower)
- **Browser environment constraints**
  - Limited to capabilities available in browser context.

## Installation

Install via npm:

```bash
$ npm install --save-dev @storycap-testrun/browser
```

## Getting Started

Please set up [`@storybook/addon-vitest`][storybook-addon-vitest] beforehand.

### 1. Configure Vitest

Add the storycap plugin to your `vitest.config.js`:

```javascript
import path from 'node:path';
import { defineConfig, defineProject } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import storycap from '@storycap-testrun/browser/vitest-plugin';

export default defineConfig({
  test: {
    projects: [
      defineProject({
        plugins: [
          storybookTest({
            configDir: '.storybook',
            storybookScript: 'storybook --ci',
          }),
          storycap({
            // options...
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      }),
    ],
  },
});
```

### 2. Setup Screenshot Capture

Create `.storybook/vitest.setup.ts`:

```typescript
import { afterEach } from 'vitest';
import { page } from '@vitest/browser/context';
import { screenshot } from '@storycap-testrun/browser';
import { setProjectAnnotations } from '@storybook/react-vite'; // Adjust for your framework
import * as projectAnnotations from './preview';

setProjectAnnotations([projectAnnotations]);

afterEach(async (context) => {
  await screenshot(page, context);
});
```

**Why `afterEach`?**

- **Post-story state**: Captures the final state after all story rendering and play functions complete
- **Test isolation**: Each story gets its own screenshot without interference from previous tests
- **Automatic execution**: No need to manually call screenshot in every story file
- **Consistent timing**: Ensures screenshots are taken at the same lifecycle point for all stories

### 3. Run Tests

```bash
$ vitest run --project=storybook
```

By default, the screenshot images are saved in the `__screenshots__` directory.

### TypeScript Setup

By importing types and merging them for the framework you use, you can enable type checking for parameters specified in each Story.

```typescript
import type { ScreenshotParameters } from '@storycap-testrun/browser';

// Replace it with the framework you are using.
declare module '@storybook/react' {
  interface Parameters {
    screenshot?: ScreenshotParameters;
  }
}

// For other frameworks, replace with your framework's module name
```

## API

### `screenshot(page, context, options)`

- `page: BrowserPage`
  - The page instance from `@vitest/browser/context`.
- `context: TestContext`
  - The test context from Vitest passed in setup hooks.
- `options: BrowserScreenshotOptions`
  - See [Options Section](#options).
- Returns: `Promise<void>`

## Vitest Plugin

### `storycap(options)`

The Vitest plugin that integrates screenshot functionality with Vitest's browser mode.

**What the plugin does:**

- **File output management**: Handles screenshot file naming and directory structure
- **Test context integration**: Provides story metadata to the screenshot function
- **Build-time configuration**: Sets up screenshot options during Vitest configuration
- **Vitest compatibility**: Ensures proper integration with Vitest's browser test lifecycle

**Why you need it:**
The plugin bridges Vitest's test execution with screenshot capture, providing the necessary context and configuration that the standalone `screenshot()` function needs to work properly in a Vitest environment.

#### Plugin Options

```typescript
type VitestStorycapPluginOptions = {
  output?: ScreenshotOutputOptions<BrowserScreenshotContext>;
};
```

##### `output.dir`

**Type:** `string`  
**Default:** `path.join(process.cwd(), '__screenshots__')`

Specifies the root directory for saving screenshot images.

##### `output.file`

**Type:** `string | ((context: BrowserScreenshotContext) => string)`  
**Default:** `path.join('[file]', '[name].png')`

Specifies the file name for the screenshot image of each Story.

When specifying a `string`, the following templates can be used:

- `[id]`: Story ID
- `[name]`: Story's name
- `[file]`: Test file path

When specifying a function, you can access the context object:

```typescript
storycap({
  output: {
    file: (context) =>
      path.join(context.file.replace('.stories.js', ''), `${context.name}.png`),
  },
});
```

## Options

Options that can be specified as the third argument in the `screenshot` function.

### `flakiness.metrics.enabled`

**Type:** `boolean`  
**Default:** `true`

When set to `true`, it monitors several metrics related to the rendering of the Story and performs stability checks.

> [!WARNING]
> As this process depends on [CDP][cdp], it works only in Chromium browsers. If enabled in browsers other than Chromium, a warning will be displayed.

### `flakiness.metrics.retries`

**Type:** `number`  
**Default:** `1000`

The number of retries during metrics monitoring. It continues monitoring for the specified number of frames (1 frame = 16ms) and ensures that the metrics stabilize.

### `flakiness.retake.enabled`

**Type:** `boolean`  
**Default:** `true`

This option calculates the hash value of the screenshot image and checks the stability of the rendering content by ensuring that there are no changes in the image.

> [!TIP]
> In the case of Chromium, `flakiness.metrics.enabled` alone is often sufficient. Enabling this option means capturing screenshots at least twice, so it's recommended to disable it if it leads to performance degradation.

### `flakiness.retake.interval`

**Type:** `number`  
**Default:** `100`

The interval in milliseconds before attempting to capture the screenshot again. The second capture is performed immediately for hash checking.

### `flakiness.retake.retries`

**Type:** `number`  
**Default:** `10`

The number of times to repeat capturing the screenshot until the hash values of the images are identical. A value of 3 or more is recommended to achieve the effect of retries.

### `hooks`

**Type:** `BrowserScreenshotHook[]`  
**Default:** `[]`

Hooks for interrupting processes before and after screenshot capture. Please specify an object that implements the following interface.

```typescript
export type BrowserScreenshotHook = {
  setup?: (
    page: BrowserPage,
    context: BrowserScreenshotContext,
  ) => Promise<void>;
  preCapture?: (
    page: BrowserPage,
    context: BrowserScreenshotContext,
  ) => Promise<void>;
  postCapture?: (
    page: BrowserPage,
    context: BrowserScreenshotContext,
    filepath: string,
  ) => Promise<void>;
};
```

Each is executed in the following lifecycle:

| Method        | Description                                                 |
| :------------ | :---------------------------------------------------------- |
| `setup`       | Immediately after the `screenshot` function is executed     |
| `preCapture`  | After stability checks are completed                        |
| `postCapture` | After the screenshot is captured, before the image is saved |

The built-in functions like Masking and Removal are implemented using Hooks.

### `fullPage`

**Type:** `boolean`  
**Default:** `true`

See [Page | Playwright][playwright-screenshot].

### `omitBackground`

**Type:** `boolean`  
**Default:** `false`

See [Page | Playwright][playwright-screenshot].

### `scale`

**Type:** `'css' | 'device'`  
**Default:** `'device'`

See [Page | Playwright][playwright-screenshot].

## Parameters

These are parameters that can be specified for each Story.

```typescript
// Button.stories.tsx
const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    screenshot: {
      /* parameters... */
    },
  },
};

export default meta;
```

### `skip`

**Type:** `boolean`  
**Default:** `false`

Skips the screenshot capture. Useful in cases where you want to conduct tests with addon-vitest but disable screenshot capture.

### `delay`

**Type:** `number`  
**Default:** None

The delay in milliseconds before capturing the screenshot. Waits after completing the basic stability checks.

### `mask`

**Type:** `string | { selector: string; color: string }`  
**Default:** None

Masks elements corresponding to the CSS selector with a rectangle. Useful for hiding elements that inevitably differ in content with each render.

### `remove`

**Type:** `string`  
**Default:** None

Removes elements corresponding to the CSS selector.

## License

[MIT © reg-viz](../../LICENSE)

![reg-viz](https://raw.githubusercontent.com/reg-viz/artwork/master/repository/footer.png)

[storycap]: https://github.com/reg-viz/storycap
[storybook-addon-vitest]: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
[vitest]: https://vitest.dev
[playwright]: https://playwright.dev
[cdp]: https://chromedevtools.github.io/devtools-protocol/
[playwright-screenshot]: https://playwright.dev/docs/api/class-page#page-screenshot

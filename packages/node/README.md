<h1 align="center">@storycap-testrun/node</h1>
<p align="center">
    <a href="https://github.com/reg-viz/storycap-testrun/actions/workflows/ci.yaml?query=branch%3Amain"><img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/reg-viz/storycap-testrun/ci.yaml?branch=main&style=flat-square&logo=GitHub%20Actions&logoColor=white"></a>
    <a href="https://www.npmjs.com/package/@storycap-testrun/node"><img alt="NPM Version" src="https://img.shields.io/npm/v/%40storycap-testrun%2Fnode?style=flat-square&logo=white"></a>
    <a href="https://github.com/reg-viz/storycap-testrun/blob/main/LICENSE"><img src="https://img.shields.io/github/license/reg-viz/storycap-testrun?label=license&style=flat-square" alt="MIT LICENSE" /></a>
</p>
<p align="center">Node.js screenshot capture for Storybook Test Runner - Provides stable screenshot functionality using Playwright for visual regression testing.</p>

---

`@storycap-testrun/node` implements stable screenshot capture for [`@storybook/test-runner`][storybook-test-runner] using the same reliability approach as [storycap][storycap] :camera:

## Why `@storycap-testrun/node`?

Standard `waitForPageReady` in [`@storybook/test-runner`][storybook-test-runner] provides only basic stability checks, often resulting in flaky visual tests.

`@storycap-testrun/node` solves this by implementing [storycap][storycap]'s proven stability detection:

- **Metrics monitoring** via [CDP][cdp] (Chrome DevTools Protocol) for rendering completion
- **Hash verification** across multiple screenshot captures for content consistency
- **Flaky test prevention** with masking and element removal capabilities

This ensures reliable visual regression testing without the common issues of timing-based approaches.

### Features

- High stability checks for rendering content
- Accurate waiting for Play Function
- Customization before and after screenshot capture using Hooks
- Masking of unstable elements
- Removal of unstable elements
- Skipping of unstable elements
- Integration with @storybook/test-runner
- CDP-based metrics monitoring

### Limitations

- **Single viewport per test run**
  - A limitation of [@storybook/test-runner](storybook-test-runner). It can be addressed by running tests in multiple Viewports as needed
- **No pseudo-state variants** (`:hover`, `:focus`, etc.)
  - Intentionally excluded to avoid conflicts with other `postVisit` hooks
  - **Workaround**: Use Story play functions to set desired states before screenshot capture

## Installation

Install via npm:

```bash
$ npm install --save-dev @storycap-testrun/node
```

## Getting Started

Please set up [`@storybook/test-runner`][storybook-test-runner] beforehand.

You can start using it immediately by calling the `screenshot` function in `postVisit`.

```typescript
// .storybook/test-runner.ts
import type { TestRunnerConfig } from '@storybook/test-runner';
import { screenshot } from '@storycap-testrun/node';

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    await screenshot(page, context, {
      // options...
    });
  },
};

export default config;
```

> [!IMPORTANT]
> Since the `screenshot` function automatically performs stability checks internally, waiting functions like `waitForPageReady` are unnecessary.

```bash
$ test-storybook
```

Then, run [`@storybook/test-runner`][storybook-test-runner].

By default, the screenshot images are saved in the `__screenshots__` directory.

### TypeScript Setup

Enable type checking for screenshot parameters by extending your Storybook framework's module declaration.

Add this to a `.d.ts` file in your project (e.g., `types/storybook.d.ts`):

```typescript
import type { ScreenshotParameters } from '@storycap-testrun/node';

// Replace it with the framework you are using.
declare module '@storybook/react' {
  interface Parameters {
    screenshot?: ScreenshotParameters;
  }
}

// For other frameworks, replace with your framework's module name
```

This enables IntelliSense and type checking when defining screenshot parameters in your stories.

## API

### `screenshot(page, context, options)`

- `page: Page`
  - The Playwright page instance passed in `postVisit`.
- `context: TestContext`
  - The test context from [`@storybook/test-runner`][storybook-test-runner] passed in `postVisit`.
- `options: NodeScreenshotOptions`
  - See [Options Section](#options).
- Returns: `Promise<void>`

## Options

Options that can be specified as the third argument in the `screenshot` function.

### `output.dir`

**Type:** `string`  
**Default:** `path.join(process.cwd(), '__screenshots__')`

Specifies the root directory for saving screenshot images.

### `output.file`

**Type:** `string | ((context: NodeScreenshotContext) => string)`  
**Default:** `path.join('[title]', '[name].png')`

Specifies the file name for the screenshot image of each Story.

When specifying a `string`, the following templates can be used:

- `[id]`: Story ID
- `[title]`: Story's title
- `[name]`: Story's name

When specifying a function, you can access the context object:

```typescript
screenshot(page, context, {
  output: {
    file: (context) => path.join(context.title, `${context.name}.png`),
  },
});
```

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

**Type:** `NodeScreenshotHook[]`  
**Default:** `[]`

Hooks for interrupting processes before and after screenshot capture. Please specify an object that implements the following interface.

```typescript
export type BrowserScreenshotHook = {
  setup?: (page: Page, context: NodeScreenshotContext) => Promise<void>;
  preCapture?: (page: Page, context: NodeScreenshotContext) => Promise<void>;
  postCapture?: (
    page: Page,
    context: NodeScreenshotContext,
    filepath: string,
  ) => Promise<void>;
};
```

Each is executed in the following lifecycle:

| Method        | Description                                                 |
| :------------ | :---------------------------------------------------------- |
| `setup`       | Immediately after the `screenshot` function is executed     |
| `preCapture`  | After `waitForPageReady` is executed                        |
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

Skips the screenshot capture. Useful in cases where you want to conduct tests with [`@storybook/test-runner`][storybook-test-runner] but disable screenshot capture.

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
[storybook-test-runner]: https://github.com/storybookjs/test-runner
[cdp]: https://chromedevtools.github.io/devtools-protocol/
[playwright-screenshot]: https://playwright.dev/docs/api/class-page#page-screenshot

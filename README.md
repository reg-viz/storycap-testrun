<h1 align="center">storycap-testrun</h1>
<p align="center">
    <a href="https://github.com/reg-viz/storycap-testrun/actions/workflows/ci.yml?query=branch%3Amain"><img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/reg-viz/storycap-testrun/ci.yml?branch=main&style=flat-square&logo=GitHub%20Actions&logoColor=white"></a>
    <a href="https://www.npmjs.com/package/storycap-testrun"><img alt="NPM Version" src="https://img.shields.io/npm/v/storycap-testrun?style=flat-square&logo=white"></a>
    <a href="https://github.com/reg-viz/storycap-testrun/blob/main/LICENSE"><img src="https://img.shields.io/github/license/reg-viz/storycap-testrun?label=license&style=flat-square" alt="MIT LICENSE" /></a>
</p>
<p align="center">A utility that provides stable screenshot capture functionality using <a href="https://github.com/storybookjs/test-runner"><code>@storybook/test-runner</code></a>.</p>

---

**storycap-testrun** features stability checks for Stories similar to those internal to [storycap][storycap], allowing for accurate screenshot capture of Stories :camera:

## Why storycap-testrun?

When conducting Visual Regression Testing using [`@storybook/test-runner`][storybook-test-runner], `waitForPageReady` is used for waiting before taking screenshots. This supports only minimal stability checks. Therefore, in practical use cases, it's necessary to devise ways for more accurate stability checks.

[storycap][storycap] achieves stable photography by monitoring various metrics when Stories are rendered in the browser using [CDP][cdp]. **storycap-testrun** follows the strategy of [storycap][storycap], performing screenshot capture that accurately checks the stability of the rendering content. Additionally, it offers a mechanism to check the stability of rendering content by verifying that the hash values of multiple captured screenshot images are identical.

Furthermore, it provides heuristic utilities for avoiding flaky tests, such as Masking and Removal, which can be specified in the Parameters for each Story.

### Features

- High stability checks for rendering content
- Accurate waiting for Play Function
- Customization before and after screenshot capture using Hooks
- Masking of unstable elements
- Removal of unstable elements
- Skipping of unstable elements

### Limitation

- Can't capture multiple Viewports
  - A limitation of [`@storybook/test-runner`][storybook-test-runner]. It can be addressed by running tests in multiple Viewports as needed.
- Doesn't support variants like `:hover`, `:focus`, clicks, etc.
  - Although this is a convenient feature supported by [storycap][storycap], it is not supported to avoid affecting other processes executed in `postVisit`.

## Requirements

- Node.js >= 18
- [`@storybook/test-runner`][storybook-test-runner] >= 0.x

## Installation

Install via npm:

```bash
$ npm install --save-dev storycap-testrun
```

## Getting Started

Please set up [`@storybook/test-runner`][storybook-test-runner] beforehand.

You can start using it immediately by calling the `screenshot` function in `postVisit`.

```typescript
// .storybook/tesr-runner.ts
import type { TestRunnerConfig } from '@storybook/test-runner';
import { screenshot } from 'storycap-testrun';

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    await screenshot(page, context, {
      /* options */
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

Then, simply run [`@storybook/test-runner`][storybook-test-runner] appropriately.

By default, the screenshot images are saved in the `__screenshots__` directory.

### TypeScript Setup

By importing `ScreenshotParameters` and merging types for the framework you use, you can enable type checking for parameters specified in each Story.

```typescript
import type { ScreenshotParameters } from 'storycap-testrun';

// Replace it with the framework you are using.
declare module '@storybook/react' {
  interface Parameters {
    screenshot?: ScreenshotParameters;
  }
}
```

## API

### `screenshot(page, context, options)`

- `page: Page`
  - The Playwright page instance passed in `postVisit`.
- `context: TestContext`
  - The test context from [`@storybook/test-runner`][storybook-test-runner] passed in `postVisit`.
- `options: ScreenshotOptions`
  - See [Options Section](#options).
- Returns: `Promise<Buffer | null>`
  - The buffer of the captured screenshot image. Returns `null` if `skip: true` is specified.

## Options

Options that can be specified as the third argument in the `screenshot` function.

### `output.dry`

**Type:** `boolean`  
**Default:** `false`

If `true` is specified, the `screenshot` function will not save the image when executed. This is useful when processing the returned Buffer.

### `output.dir`

**Type:** `string`  
**Default:** `path.join(process.cwd(), '__screenshots__')`

Specifies the root directory for saving screenshot images.

### `output.file`

**Type:** `string | ((context: TestContext) => string)`  
**Default:** `path.join('[title]', '[name].png')`

Specifies the file name for the screenshot image of each Story.

When specifying a `string`, the following templates can be used:

- `[id]`: Story ID
- `[title]`: Story's title
- `[name]`: Story's name

### `flakiness.metrics.enabled`

**Type:** `boolean`  
**Default:** `true`

When `true` is specified, it monitors several metrics related to the rendering of the Story and performs stability checks.

> [!WARNING]  
> As this process depends on [CDP][cdp], it works only in Chromium browsers. If enabled in browsers other than Chromium, a warning will be displayed.

### `flakiness.metrics.retries`

**Type:** `number`  
**Default:** `1000`

The number of retries during metrics monitoring. It continues monitoring for the specified number of frames (1 frame = 16ms) and ensures that the metrics stabilize.

### `flakiness.retake.enabled`

**Type:** `boolean`  
**Default:** `true`

It calculates the hash value of the screenshot image and checks the stability of the rendering content by ensuring that there are no changes in the image.

> [!TIP]  
> In the case of Chromium, `flakiness.metrics.enabled` alone is often sufficient. Enabling this option means capturing screenshots at least twice, so it's recommended to disable it if it leads to performance degradation.

### `flakiness.retake.interval`

**Type:** `number`  
**Default:** `100`

The interval in milliseconds before attempting to capture the screenshot again. The second capture is performed immediately for hash checking.

### `flakiness.retake.retries`

**Type:** `number`  
**Default:** `5`

The number of times to repeat capturing the screenshot until the hash values of the images are identical. A value of 3 or more is recommended to achieve the effect of retries.

### `hooks`

**Type:** `ScreenshotHook[]`  
**Default:** `[]`

Hooks for interrupting processes before and after screenshot capture. Please specify an object that implements the following interface.

```typescript
export type ScreenshotHook = {
  setup?: TestHook;
  preCapture?: TestHook;
  postCapture?: (
    page: Page,
    context: TestContext,
    image: ScreenshotImage,
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

## CHANGELOG

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT © reg-viz](./LICENSE)

![reg-viz](https://raw.githubusercontent.com/reg-viz/artwork/master/repository/footer.png)

[storycap]: https://github.com/reg-viz/storycap
[storybook-test-runner]: https://github.com/storybookjs/test-runner
[cdp]: https://chromedevtools.github.io/devtools-protocol/
[playwright-screenshot]: https://playwright.dev/docs/api/class-page#page-screenshot

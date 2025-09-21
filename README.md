<h1 align="center">storycap-testrun</h1>
<p align="center">
    <a href="https://github.com/reg-viz/storycap-testrun/actions/workflows/ci.yaml?query=branch%3Amain"><img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/reg-viz/storycap-testrun/ci.yaml?branch=main&style=flat-square&logo=GitHub%20Actions&logoColor=white"></a>
    <a href="https://github.com/reg-viz/storycap-testrun/blob/main/LICENSE"><img src="https://img.shields.io/github/license/reg-viz/storycap-testrun?label=license&style=flat-square" alt="MIT LICENSE" /></a>
</p>
<p align="center">Stable visual testing for Storybook - Supporting both <a href="https://github.com/storybookjs/test-runner"><code>@storybook/test-runner</code></a> and <a href="https://storybook.js.org/docs/writing-tests/integrations/vitest-addon"><code>@storybook/addon-vitest</code></a> workflows.</p>

> [!WARNING]
>
> **Migration Notice for Existing Users**
>
> If you're currently using the legacy `storycap-testrun` package, please note that **v2 introduces breaking changes** with a new package structure.
>
> - **For `@storybook/test-runner` users**: Migrate to `@storycap-testrun/node`
> - **For `@storybook/addon-vitest` users**: Use `@storycap-testrun/browser`
>
> **👉 [See the complete Migration Guide](./MIGRATION.md)** for step-by-step upgrade instructions.

**storycap-testrun** implements the same stability checking approach as [storycap][storycap], enabling reliable screenshot capture for Visual Regression Testing in Storybook workflows :camera:

## Packages

This monorepo contains three packages:

### [@storycap-testrun/browser](./packages/browser)

Screenshot capture for **Storybook addon-vitest** - Provides stable visual testing functionality and Vitest plugin for Storybook stories running in browser environments.

### [@storycap-testrun/node](./packages/node)

Node.js screenshot capture for **Storybook Test Runner** - Provides stable screenshot functionality using Playwright for visual regression testing.

## Why storycap-testrun?

### The Problem

Visual Regression Testing in Storybook faces different challenges depending on your testing framework:

**Common challenges:**

- Incomplete rendering detection leads to inconsistent screenshots
- Animation and dynamic content cause flaky test results
- No built-in mechanisms to handle unstable elements

**Framework-specific limitations:**

- `@storybook/test-runner`: Standard `waitForPageReady` provides only minimal stability checks
- `@storybook/addon-vitest`: Basic screenshot APIs lack stability detection and flexible configuration options

### The Solution

[storycap][storycap] solved this by monitoring browser rendering metrics through [CDP][cdp] (Chrome DevTools Protocol) to accurately determine when content is fully stable. **storycap-testrun** brings this proven approach to modern Storybook testing workflows.

**Key stability mechanisms:**

- **Metrics monitoring**: Tracks rendering completion through browser performance metrics
- **Hash verification**: Ensures screenshot consistency by comparing image hashes across multiple captures
- **Flaky test prevention**: Built-in masking and element removal for dynamic content

This approach significantly reduces visual test flakiness while maintaining fast execution times.

## Features

- High stability checks for rendering content
- Accurate waiting for Play Function
- Customization before and after screenshot capture using Hooks
- Masking of unstable elements
- Removal of unstable elements
- Skipping of unstable elements
- Support for both `@storybook/test-runner` and `@storybook/addon-vitest`
- CDP-based metrics monitoring in Chromium browsers

## Which Package Should I Use?

Choose the right package based on your current Storybook testing setup:

| Testing Framework           | Package                                           |
| --------------------------- | ------------------------------------------------- |
| **@storybook/addon-vitest** | [`@storycap-testrun/browser`](./packages/browser) |
| **@storybook/test-runner**  | [`@storycap-testrun/node`](./packages/node)       |

**Not sure which testing framework you're using?**

- If you run tests with `vitest` command → Use **browser** package
- If you run tests with `test-storybook` command → Use **node** package

## Getting Started

Choose the package that matches your testing environment:

### For `@storybook/addon-vitest` users

Use `@storycap-testrun/browser` package for Vitest browser environments.

```bash
npm install --save-dev @storycap-testrun/browser
```

**See [@storycap-testrun/browser documentation](./packages/browser) for detailed setup and usage.**

### For `@storybook/test-runner` users

Use `@storycap-testrun/node` package for Node.js environments with Playwright.

```bash
npm install --save-dev @storycap-testrun/node
```

**See [@storycap-testrun/node documentation](./packages/node) for detailed setup and usage.**

## Common Features

Both packages share common functionality provided by `@storycap-testrun/internal`:

### Story Parameters

Configure screenshot behavior for individual stories using these parameters:

```typescript
// Button.stories.tsx
const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    screenshot: {
      skip: false, // Skip screenshot capture for this story
      delay: 1000, // Additional delay after stability checks (ms)
      mask: '.dynamic-element', // Hide dynamic content with colored overlay
      remove: '.ads, .analytics', // Remove elements before screenshot
    },
  },
};
```

**Parameter Details:**

- **`skip`**: Disable screenshot capture while keeping other tests enabled
- **`delay`**: Extra wait time after automatic stability detection completes
- **`mask`**: CSS selector for elements to cover with a colored rectangle (useful for timestamps, random content)
- **`remove`**: CSS selector for elements to completely remove from the DOM (useful for ads, analytics)

### Stability Detection

**Automatic Stability Checks:**

- **Metrics Monitoring**: Uses Chrome DevTools Protocol to monitor rendering completion signals (layout shifts, network activity, paint events)
- **Hash Verification**: Captures multiple screenshots and compares their hash values to ensure content stability
- **Retry Logic**: Automatically retries captures when instability is detected, with configurable limits

**Why This Matters:**

- Eliminates flaky tests caused by incomplete rendering
- Reduces false positives in visual regression detection
- Works reliably with animations, lazy-loaded content, and dynamic elements

For detailed API documentation, configuration options, and advanced usage, please refer to the specific package documentation:

- [@storycap-testrun/browser documentation](./packages/browser) - For Vitest browser environments
- [@storycap-testrun/node documentation](./packages/node) - For Node.js environments

## Examples

- [Vitest + React example](./examples/v9-react-vite) - Using `@storycap-testrun/browser`
- [Test Runner + React example](./examples/v8-react) - Using `@storycap-testrun/node`

## License

[MIT © reg-viz](./LICENSE)

![reg-viz](https://raw.githubusercontent.com/reg-viz/artwork/master/repository/footer.png)

[storycap]: https://github.com/reg-viz/storycap
[storybook-test-runner]: https://github.com/storybookjs/test-runner
[storybook-addon-vitest]: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
[cdp]: https://chromedevtools.github.io/devtools-protocol/
[playwright-screenshot]: https://playwright.dev/docs/api/class-page#page-screenshot

---
'@storycap-testrun/internal': minor
'@storycap-testrun/browser': minor
---

Add a per-story `viewport` parameter to override the capture viewport

Stories that do not fit into the globally configured viewport — dialogs and
other fixed-position overlays are the typical case — can now request their own
capture size:

```typescript
export const TallDialog = {
  parameters: {
    screenshot: {
      viewport: { height: 800 },
    },
  },
};
```

Both dimensions are optional. An omitted dimension falls back to the plugin's
`viewport` option (or the Playwright context viewport when the plugin option is
not set), so a story can override only the height it needs while multiple runs
with different widths keep their own width.

The Playwright context is resized for the duration of the capture and restored
afterwards. The `@storycap-testrun/node` package is unchanged: with
`@storybook/test-runner`, the same result is achievable in userland via
`page.setViewportSize()` in a `preVisit` hook.

For adapter implementors: `ScreenshotAdapter.prepareCapture` gains a third
`viewport` argument and `takeScreenshot` options gain a `viewport` field,
carrying the per-story override.

---
'@storycap-testrun/internal': minor
'@storycap-testrun/browser': minor
'@storycap-testrun/node': minor
---

Add per-story image options and fix viewport/fullPage behavior in vitest browser mode.

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

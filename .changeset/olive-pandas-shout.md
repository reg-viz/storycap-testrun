---
'@storycap-testrun/browser': patch
---

Capture the full image in configurations that were silently cropped

Three cases produced a damaged screenshot without raising anything:

- A `viewport` option larger than the Playwright context viewport. `fullPage: false` was truncated to the context size, and the stitched full-page image gained black bands.
- A `deviceScaleFactor` other than 1. The stitched full-page image came back at CSS-pixel dimensions with its right and bottom cropped away, while every other capture path was scaled correctly.
- Content whose height is not a whole multiple of the viewport height. The last stitched chunk repeated the previous one and the real bottom of the page never appeared.

If you use a `viewport` that differs from the Playwright context viewport, or a `deviceScaleFactor` other than 1, your screenshots change with this release and need a new baseline.

Capturing now resizes the Playwright context and restores it afterwards. When the context has no viewport of its own — which is what Vitest does whenever `browser.ui` is enabled, the default outside CI — the resize cannot be undone, and the page keeps the configured size for the rest of the run. Set `contextOptions.viewport` on the Playwright provider to avoid it.

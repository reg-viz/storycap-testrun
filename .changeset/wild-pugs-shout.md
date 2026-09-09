---
'@storycap-testrun/browser': minor
'@storycap-testrun/internal': minor
---

Capture full-page screenshots in a single shot instead of stitching tiles

`fullPage: true` used to scroll the story iframe and stitch viewport-sized tiles, which re-rendered `position: sticky` and `position: fixed` elements into every tile and painted over the content behind them. The iframe is now grown to its content size and captured in one Playwright screenshot, with viewport-relative units pinned to their current pixel lengths so `100vh` does not grow along with it; a story whose size follows the viewport through JavaScript or a cross-origin stylesheet is still captured at the viewport size and logs a warning.

All 51 screenshots in the example suite keep their exact dimensions, and only text antialiasing changes outside the sticky/fixed fix.

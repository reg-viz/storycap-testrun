---
'@storycap-testrun/browser': patch
---

Size the tester iframe itself so viewport overrides apply under Vitest 5

`prepareCapture` resized the Playwright context and the iframe's wrapper
element to the capture viewport. Vitest 4 sized the tester iframe through that
wrapper, but Vitest 5 sets `width` / `height` on the iframe directly from the
`--viewport-width` / `--viewport-height` CSS variables on `body`, so the
wrapper no longer controls the iframe size. Under Vitest 5 a per-story
`viewport` override (and a plugin `viewport` larger than the Playwright
context) grew the context but left the iframe at the configured
`browser.viewport` size, cropping the capture to it.

Both the iframe and its wrapper are now sized for the capture and restored
afterwards. Captures taken with Vitest 4 are unchanged.

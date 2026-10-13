---
'@storycap-testrun/browser': patch
---

Only rewrite the tester iframe's inline style when its size has to change

3.1.2 started sizing the tester iframe itself for every capture so that per-story
`viewport` overrides apply under Vitest 5. Rewriting the iframe's inline style,
even to the size it already has, makes Chromium re-rasterize the frame and
changes how images are resampled in the capture: photos and raster icons came
out with pixel-level noise compared to 3.1.1 and failed visual regression
comparisons for every story that contains one.

The wrapper is still sized as before, and the iframe is now only touched when
its rendered size still differs from the capture size afterwards, i.e. for
stories with a viewport override under Vitest 5. Stories without an override
capture exactly as they did with 3.1.1 again.

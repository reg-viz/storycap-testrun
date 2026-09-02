---
'@storycap-testrun/browser': patch
---

Capture content wider than the viewport in full-page screenshots

`fullPage: true` only stitched vertically, so content wider than the viewport — horizontally scrollable tables, lists, and similar layouts — was silently cropped to the viewport width. Full-page capture now tiles both axes: it scrolls horizontally as well, and stitches the chunks row by row, producing images sized to the content's full `scrollWidth` x `scrollHeight`. Vertical-only content produces byte-identical output to the previous behavior, and `deviceScaleFactor` other than 1 keeps working.

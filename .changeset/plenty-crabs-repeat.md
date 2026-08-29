---
'@storycap-testrun/browser': patch
---

Stop inlining Vitest's type surface into the published declarations

`dist/index.d.mts` and `dist/index.d.cts` shrink from about 1.1 MB to 2.5 kB; the
types are now imported from `vitest` and `vitest/browser` instead of being copied
in. The exported API is unchanged.

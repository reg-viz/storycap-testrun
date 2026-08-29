---
'@storycap-testrun/internal': patch
---

Run `cleanupCapture` when `prepareCapture` throws

`prepareCapture` ran outside the try block, so an adapter that acquires
something there could not release it through `cleanupCapture` if a later step
failed.

---
'@storycap-testrun/browser': patch
---

Stop forwarding a `null` viewport override to the Vitest browser command

Since 3.1.0, `prepareCapture` passed the resolved `viewport` parameter to the
`__storycap_prepareViewport` browser command as-is. Stories without
`parameters.screenshot.viewport` resolve it to `null`, and Vitest 5 probes the
first argument of a browser command for a Locator with
`typeof args[0] === 'object' && 'selector' in args[0]`, which throws
`TypeError: Cannot use 'in' operator to search for 'selector' in null`. Every
story without an explicit viewport override failed to capture under Vitest 5.

The command is now called without arguments when there is no override, as it
was in 3.0.1. Stories that do set a viewport override are unaffected.

---
'@storycap-testrun/internal': major
'@storycap-testrun/browser': major
'@storycap-testrun/node': major
---

Drop support for Node.js 20

Node.js 20 reached end-of-life on 2026-04-30. All three packages now declare
`engines.node: ">=22"` and CI runs against Node.js 22 and 24 only.

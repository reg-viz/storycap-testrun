---
'@storycap-testrun/browser': patch
---

Fix bundled `.d.mts` / `.d.cts` emitting `vitestStorycapPluginOptions` (the default export of `@storycap-testrun/browser/vitest-plugin`) as a type-only export, which caused `TS1362: cannot be used as a value because it was exported using 'export type'` in TypeScript consumers using `import storycap from "@storycap-testrun/browser/vitest-plugin"` from a `vitest.config.ts` (issue #266).

The browser package build is now split into per-entry tsdown configurations (`tsdown.config.ts` with `defineConfig` array) so the upstream `rolldown-plugin-dts` shared-chunk re-export bug — which incorrectly tagged runtime values with the `type` modifier in the shared `index-XXXX.d.mts` chunk — is avoided. Runtime output is unchanged.

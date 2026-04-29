// Regression guard for issue #266 (ESM consumer path / .d.mts side).
// Mirrors the failing scenario from the issue: if the bundled `.d.mts` re-exports
// the default as type-only, this file fails to compile with TS1362.
//
// The .mts extension makes TypeScript's nodenext resolver pick up the sibling
// `index.d.mts` from `import '../dist/vitest-plugin/index.mjs'` (the `import`
// condition target of the package.json `exports` map for `./vitest-plugin`).
//
// Requires `pnpm build` to have populated `packages/browser/dist/`.
import storycap from '../dist/vitest-plugin/index.mjs';

void storycap();

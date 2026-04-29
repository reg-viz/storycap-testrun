// Regression guard for issue #266 (CJS consumer path / .d.cts side).
// The original bug appeared in both dist/index-XXXX.d.mts and dist/index-XXXX.d.cts;
// this file ensures the CJS-side declaration is also regression-protected.
//
// The .cts extension makes TypeScript's nodenext resolver pick up the sibling
// `index.d.cts` from `import '../dist/vitest-plugin/index.cjs'` (the `require`
// condition target of the package.json `exports` map for `./vitest-plugin`).
//
// Requires `pnpm build` to have populated `packages/browser/dist/`.
import storycap from '../dist/vitest-plugin/index.cjs';

void storycap();

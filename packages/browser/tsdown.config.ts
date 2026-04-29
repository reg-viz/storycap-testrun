import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    clean: true,
    deps: {
      neverBundle: ['vitest/browser'],
    },
    dts: true,
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    minify: true,
    sourcemap: false,
    splitting: false,
  },
  {
    clean: false,
    deps: {
      neverBundle: ['vitest/browser'],
    },
    dts: true,
    entry: ['src/vitest-plugin/index.ts'],
    format: ['esm', 'cjs'],
    minify: true,
    outDir: 'dist/vitest-plugin',
    sourcemap: false,
    splitting: false,
  },
]);

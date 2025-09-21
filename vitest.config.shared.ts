import { defineConfig } from 'vitest/config';

export const createSharedConfig = (
  options: { environment?: 'node' | 'happy-dom' } = {},
) =>
  defineConfig({
    test: {
      environment: options.environment ?? 'node',
      globals: true,
    },
    esbuild: {
      target: 'node20',
    },
  });

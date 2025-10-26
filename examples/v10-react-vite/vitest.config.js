import { defineConfig, defineProject } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import storycap from '@storycap-testrun/browser/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    // Use `workspace` field in Vitest < 3.2
    projects: [
      defineProject({
        extends: true,
        plugins: [
          storybookTest({
            // The location of your Storybook config, main.js|ts
            configDir: path.join(dirname, '.storybook'),
            // This should match your package.json script to run Storybook
            // The --ci flag will skip prompts and not open a browser
            storybookScript: 'pnpm storybook --ci',
          }),
          storycap({
            output: {
              file: (context) =>
                path.join(
                  context.file
                    .slice(`stories${path.sep}`.length)
                    .replaceAll('.stories.js', ''),
                  `${context.name}.png`,
                ),
            },
          }),
        ],
        test: {
          name: 'storybook',
          // Enable browser mode
          browser: {
            enabled: true,
            // Make sure to install Playwright
            provider: 'playwright',
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      }),
    ],
  },
});

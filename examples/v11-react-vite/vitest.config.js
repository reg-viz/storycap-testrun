import { defineConfig, defineProject } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import storycap from '@storycap-testrun/browser/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const screenshotFile = (context) =>
  path.join(
    context.file
      .slice(`stories${path.sep}`.length)
      .replaceAll('.stories.js', ''),
    `${context.name}.png`,
  );

const project = ({ name, viewport, dir, contextOptions }) =>
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
        viewport,
        output: {
          ...(dir != null && {
            dir: path.join(process.cwd(), '__screenshots__', dir),
          }),
          file: screenshotFile,
        },
      }),
    ],
    test: {
      name,
      // Enable browser mode
      browser: {
        enabled: true,
        // Make sure to install Playwright
        provider: playwright(
          contextOptions == null ? undefined : { contextOptions },
        ),
        headless: true,
        instances: [{ browser: 'chromium' }],
      },
      setupFiles: ['./.storybook/vitest.setup.ts'],
    },
  });

export default defineConfig({
  plugins: [react()],
  test: {
    // Use `workspace` field in Vitest < 3.2
    projects: [
      project({
        name: 'storybook',
        viewport: { width: 1280, height: 720 },
      }),
      // A viewport larger than the Playwright context viewport, and a scale
      // factor other than 1, are the two configurations where a capture can be
      // cropped without any error being raised.
      project({
        name: 'storybook-wide',
        viewport: { width: 1600, height: 1080 },
        dir: 'wide',
      }),
      project({
        name: 'storybook-hidpi',
        viewport: { width: 1280, height: 720 },
        dir: 'hidpi',
        contextOptions: { deviceScaleFactor: 2 },
      }),
    ],
  },
});

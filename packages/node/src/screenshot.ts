import * as path from 'node:path';
import type { TestContext } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';
import type { Page } from 'playwright';
import type { NodeScreenshotOptions } from './options';
import type { NodeScreenshotContext } from './context';
import {
  createScreenshotFunction,
  resolveScreenshotFilename,
  type ScreenshotAdapter,
  type ScreenshotOutputOptions,
} from '@storycap-testrun/internal';
import { createAnimationsHook } from './hooks/animation';
import { createRemovalHook } from './hooks/removal';
import { createMaskingHook } from './hooks/masking';
import { waitForStable } from './wait-for-stable';
import { createHash } from 'node:crypto';

/**
 * Creates screenshot adapter for Node.js environment with Storybook test-runner integration
 * TODO: unit test
 */
export const createNodeScreenshotAdapter = (
  output: Required<ScreenshotOutputOptions<NodeScreenshotContext>>,
): ScreenshotAdapter<Page, TestContext, NodeScreenshotContext> => ({
  createContext: (context) => ({
    id: context.id,
    title: context.title,
    name: context.name,
  }),

  getParameters: async (page, context) => {
    const { parameters } = await getStoryContext(page, context);
    return parameters['screenshot'] ?? {};
  },

  resolveFilepath: async (context) => {
    return path.join(output.dir, resolveScreenshotFilename(output, context));
  },

  createHash: async (data) => {
    return createHash('sha256').update(data).digest('hex');
  },

  waitForStable: async (page, context, options) => {
    await waitForStable(page, context, options);
  },

  takeScreenshot: async (page, filepath, options) => {
    const data = await page.screenshot({
      path: filepath,
      animations: 'disabled',
      caret: 'hide',
      fullPage: options.fullPage,
      omitBackground: options.omitBackground,
      scale: options.scale,
      type: options.type,
    });
    return data;
  },

  createAnimationsHook,
  createRemovalHook,
  createMaskingHook,
});

/**
 * Captures screenshot in Node.js environment using Playwright and Storybook test context
 */
export const screenshot = async (
  page: Page,
  context: TestContext,
  options: NodeScreenshotOptions = {},
): Promise<void> => {
  const output = {
    dir: path.join(process.cwd(), '__screenshots__'),
    file: path.join('[title]', '[name].png'),
    ...options.output,
  };

  const adapter = createNodeScreenshotAdapter(output);
  const fn = createScreenshotFunction(adapter);

  await fn(page, context, options);
};

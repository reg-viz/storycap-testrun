import type { TestContext } from 'vitest';
import type {
  ResolveScreenshotFilepathParams,
  ResolveScreenshotFilepathResult,
} from './vitest-plugin';
import type { BrowserPage } from '@vitest/browser/context';
import { commands } from '@vitest/browser/context';
import type { BrowserScreenshotOptions } from './options';
import {
  createScreenshotFunction,
  type ScreenshotAdapter,
} from '@storycap-testrun/internal';
import type { BrowserScreenshotContext } from './context';
import { createAnimationsHook } from './hooks/animation';
import { createRemovalHook } from './hooks/removal';
import { createMaskingHook } from './hooks/masking';
import { waitForStable } from './wait-for-stable';

declare module '@vitest/browser/context' {
  interface BrowserCommands {
    resolveScreenshotFilepath: (
      ...params: ResolveScreenshotFilepathParams
    ) => ResolveScreenshotFilepathResult;
  }
}

type TestContextWithStory = TestContext & {
  story: {
    id: string;
    storyName: string;
    parameters: Record<string, any>;
  };
};

/**
 * Validates that test context contains Storybook story information
 */
function assertTestContextWithStory(
  context: unknown,
): asserts context is TestContextWithStory {
  if (context == null || typeof context !== 'function') {
    throw new Error(
      'The test context is not an object. Make sure to run the test in a Storybook environment.',
    );
  }
  if (!('story' in context)) {
    throw new Error(
      'The test context does not contain story information. Make sure to run the test in a Storybook environment.',
    );
  }
  if (!('id' in (context as any).story)) {
    throw new Error(
      'The test context story information does not contain an `id`.',
    );
  }
  if (!('storyName' in (context as any).story)) {
    throw new Error(
      'The test context story information does not contain a `storyName`.',
    );
  }
  if (!('parameters' in (context as any).story)) {
    throw new Error(
      'The test context story information does not contain `parameters`.',
    );
  }
}

/**
 * Creates screenshot adapter for Vitest browser environment with Storybook integration
 * TODO: unit test
 */
export const createBrowserScreenshotAdapter = (): ScreenshotAdapter<
  BrowserPage,
  TestContextWithStory,
  BrowserScreenshotContext
> => ({
  createContext: (context) => ({
    id: context.story.id,
    file: context.task.file.name,
    name: context.story.storyName,
  }),

  getParameters: (_, context) => context.story.parameters?.['screenshot'] ?? {},

  resolveFilepath: async (context) => {
    return commands.resolveScreenshotFilepath(context);
  },

  createHash: async (data) => {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const buffer = await window.crypto.subtle.digest('SHA-256', bytes);

    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },

  waitForStable: async (_, context, options) => {
    await waitForStable(context, options);
  },

  takeScreenshot: async (page, filepath, options) => {
    const data = await page.screenshot({
      path: filepath,
      save: true,
      base64: true,
      animations: 'disabled',
      caret: 'hide',
      fullPage: options.fullPage,
      omitBackground: options.omitBackground,
      scale: options.scale,
      type: options.type,
    });
    return data.base64;
  },

  createAnimationsHook,
  createRemovalHook,
  createMaskingHook,
});

/**
 * Captures screenshot in Vitest browser environment using Storybook test context
 */
export const screenshot = async (
  page: BrowserPage,
  context: TestContext,
  options: BrowserScreenshotOptions = {},
): Promise<void> => {
  assertTestContextWithStory(context);

  const adapter = createBrowserScreenshotAdapter();
  const fn = createScreenshotFunction(adapter);

  await fn(page, context, options);
};

import type { TestContext } from 'vitest';
import type {
  ResolveScreenshotFilepathParams,
  ResolveScreenshotFilepathResult,
  ResolveViewportParams,
  ResolveViewportResult,
  TakeScreenshotParams,
  TakeScreenshotResult,
} from './vitest-plugin';
import type { BrowserPage } from 'vitest/browser';
import { commands } from 'vitest/browser';
import type { BrowserScreenshotOptions } from './options';
import {
  createScreenshotFunction,
  type ScreenshotAdapter,
} from '@storycap-testrun/internal';
import type { BrowserScreenshotContext } from './context';
import { createAnimationsHook } from './hooks/animation';
import { createRemovalHook } from './hooks/removal';
import { createMaskingHook } from './hooks/masking';
import {
  fitFrameToContent,
  getCaptureFrame,
  resizeCaptureFrame,
  waitForReflow,
  type CaptureFrame,
  type Size,
} from './viewport';
import type { UnfreezeViewportUnits } from './viewport-units';
import { waitForStable } from './wait-for-stable';

declare module 'vitest/browser' {
  interface BrowserCommands {
    resolveScreenshotFilepath: (
      ...params: ResolveScreenshotFilepathParams
    ) => ResolveScreenshotFilepathResult;
    __storycap_takeScreenshot: (
      ...params: TakeScreenshotParams
    ) => TakeScreenshotResult;
    __storycap_resolveViewport: (
      ...params: ResolveViewportParams
    ) => ResolveViewportResult;
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
> => {
  // One adapter is built per capture, so this state cannot leak between
  // stories, and it stays inside the tester, which means concurrently running
  // test files cannot see each other's iframe either.
  let captureFrame: CaptureFrame | null = null;
  let originalFrameStyle: string | null = null;
  let originalWrapperStyle: string | null = null;
  let viewport: Size = { width: 0, height: 0 };
  let unfreezeViewportUnits: UnfreezeViewportUnits | null = null;

  return {
    createContext: (context) => ({
      id: context.story.id,
      file: context.task.file.name,
      name: context.story.storyName,
    }),

    getParameters: (_, context) =>
      context.story.parameters?.['screenshot'] ?? {},

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

    takeScreenshot: async (_page, filepath, options) => {
      return commands.__storycap_takeScreenshot(filepath, {
        omitBackground: options.omitBackground,
        scale: options.scale,
        type: options.type,
      });
    },

    prepareCapture: async (_page, _context, override) => {
      viewport = await commands.__storycap_resolveViewport(override);

      captureFrame = getCaptureFrame();
      if (captureFrame == null) {
        return;
      }

      // Captured before the first resize so cleanup can put back exactly what
      // Vitest left here, including the scale it applies to fit the iframe on
      // screen.
      originalFrameStyle = captureFrame.frame.style.cssText;
      originalWrapperStyle = captureFrame.wrapper?.style.cssText ?? null;

      resizeCaptureFrame(captureFrame, viewport);
      await waitForReflow();
    },

    fitCaptureToContent: async (_page, context, { fullPage }) => {
      // Without `fullPage` the iframe is already sized to the viewport, which
      // is exactly the region to capture.
      if (!fullPage || captureFrame == null) {
        return;
      }

      const { unfreeze, truncated } = await fitFrameToContent(
        captureFrame,
        viewport,
      );
      unfreezeViewportUnits = unfreeze;

      if (truncated.length > 0) {
        console.warn(
          `[storycap] "${context.name}" is cropped to the viewport ` +
            `(${truncated.join(' and ')}). Its size follows the viewport ` +
            `through something this cannot pin — a length computed in ` +
            `JavaScript from window.innerHeight/innerWidth, or a stylesheet ` +
            `served cross-origin — so growing the frame to the content grew ` +
            `the content with it. Give the story a fixed size to capture it ` +
            `in full.`,
        );
      }
    },

    cleanupCapture: async () => {
      // Undone before the frame is resized back so the story is never left
      // holding pixel lengths that were derived from a viewport it no longer
      // has.
      unfreezeViewportUnits?.();
      unfreezeViewportUnits = null;

      if (captureFrame == null) {
        return;
      }
      captureFrame.frame.style.cssText = originalFrameStyle ?? '';
      if (captureFrame.wrapper != null) {
        captureFrame.wrapper.style.cssText = originalWrapperStyle ?? '';
      }
      captureFrame = null;
    },

    createAnimationsHook,
    createRemovalHook,
    createMaskingHook,
  };
};

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

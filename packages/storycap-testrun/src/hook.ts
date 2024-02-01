import type { TestContext, TestHook } from '@storybook/test-runner';
import type { Page } from 'playwright';

export type ScreenshotImage = {
  buffer: Buffer;
  path: string;
};

export type ScreenshotHook = {
  setup?: TestHook;
  preCapture?: TestHook;
  postCapture?: (
    page: Page,
    context: TestContext,
    image: ScreenshotImage,
  ) => Promise<void>;
};

export const createHookProcessor = (hooks: ScreenshotHook[]) => ({
  async setup(page: Page, context: TestContext) {
    for (const hook of hooks) {
      await hook.setup?.(page, context);
    }
  },

  async preCapture(page: Page, context: TestContext) {
    for (const hook of hooks) {
      await hook.preCapture?.(page, context);
    }
  },

  async postCapture(page: Page, context: TestContext, image: ScreenshotImage) {
    for (const hook of hooks) {
      await hook.postCapture?.(page, context, image);
    }
  },
});

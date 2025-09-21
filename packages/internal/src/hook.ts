import type { ScreenshotContext } from './context';

/**
 * Lifecycle hooks for screenshot operations with setup, pre-capture, and post-capture phases
 */
export type ScreenshotHook<Page, Context extends ScreenshotContext> = {
  setup?: (page: Page, context: Context) => Promise<void>;
  preCapture?: (page: Page, context: Context) => Promise<void>;
  postCapture?: (
    page: Page,
    context: Context,
    filepath: string,
  ) => Promise<void>;
};

/**
 * Processed hook that ensures all lifecycle methods are present
 */
export type ScreenshotHookProcessor<
  Page,
  Context extends ScreenshotContext,
> = Required<ScreenshotHook<Page, Context>>;

/**
 * Creates a processor that executes hooks sequentially during screenshot lifecycle
 * TODO: unit test
 */
export const createHookProcessor = <Page, Context extends ScreenshotContext>(
  hooks: ScreenshotHook<Page, Context>[],
): ScreenshotHookProcessor<Page, Context> => ({
  async setup(page: Page, context: Context) {
    for (const hook of hooks) {
      await hook.setup?.(page, context);
    }
  },

  async preCapture(page: Page, context: Context) {
    for (const hook of hooks) {
      await hook.preCapture?.(page, context);
    }
  },

  async postCapture(page: Page, context: Context, filepath: string) {
    for (const hook of hooks) {
      await hook.postCapture?.(page, context, filepath);
    }
  },
});

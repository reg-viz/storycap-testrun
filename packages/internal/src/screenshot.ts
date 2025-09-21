import type { ScreenshotContext } from './context';
import { RetakeExceededError } from './error';
import type { ScreenshotHook } from './hook';
import { createHookProcessor } from './hook';
import type { ScreenshotParameters, ScreenshotMaskConfig } from './parameters';
import { resolveScreenshotParameters } from './parameters';
import { sleep, type RequiredDeep } from './utility';

/**
 * Configuration for screenshot output directory and filename
 */
export type ScreenshotOutputOptions<Context extends ScreenshotContext> = {
  dir?: string;
  file?: string | ((context: Context) => string);
};

/**
 * Configuration for screenshot image properties
 */
export type ScreenshotImageOptions = {
  fullPage?: boolean;
  omitBackground?: boolean;
  scale?: 'css' | 'device';
};

/**
 * Configuration for page metrics monitoring during screenshot capture
 */
export type ScreenshotMetricsOptions = {
  enabled?: boolean;
  retries?: number;
};

/**
 * Configuration for screenshot retake behavior to handle flaky captures
 */
export type ScreenshotRetakeOptions = {
  enabled?: boolean;
  interval?: number;
  retries?: number;
};

/**
 * Combined configuration for handling screenshot flakiness through metrics and retakes
 */
export type ScreenshotFlakinessOptions = {
  metrics?: ScreenshotMetricsOptions;
  retake?: ScreenshotRetakeOptions;
};

/**
 * Complete configuration options for screenshot operations
 */
export type ScreenshotOptions<Page, Context extends ScreenshotContext> = {
  flakiness?: ScreenshotFlakinessOptions;
  hooks?: ScreenshotHook<Page, Context>[];
  image?: ScreenshotImageOptions;
};

/**
 * Screenshot options with all defaults applied
 */
export type ResolvedScreenshotOptions<
  Page,
  Context extends ScreenshotContext,
> = RequiredDeep<ScreenshotOptions<Page, Context>>;

const defaultPartialScreenshotOptions = {
  flakiness: {
    metrics: {
      enabled: true,
      retries: 1000,
    },
    retake: {
      enabled: true,
      interval: 100,
      retries: 10,
    },
  },
  hooks: [],
  image: {
    fullPage: true,
    omitBackground: false,
    scale: 'device',
  },
} satisfies ScreenshotOptions<any, any>;

/**
 * Resolves screenshot options by applying defaults recursively
 * TODO: unit test
 */
export const resolveScreenshotOptions = <
  Page,
  Context extends ScreenshotContext,
>(
  options: ScreenshotOptions<Page, Context>,
): ResolvedScreenshotOptions<Page, Context> => {
  return {
    ...defaultPartialScreenshotOptions,
    ...options,
    flakiness: {
      ...defaultPartialScreenshotOptions.flakiness,
      ...options.flakiness,
      metrics: {
        ...defaultPartialScreenshotOptions.flakiness?.metrics,
        ...options.flakiness?.metrics,
      },
      retake: {
        ...defaultPartialScreenshotOptions.flakiness?.retake,
        ...options.flakiness?.retake,
      },
    },
    image: {
      ...defaultPartialScreenshotOptions.image,
      ...options.image,
    },
  };
};

/**
 * Resolves screenshot filename by substituting context placeholders or calling function
 * TODO: unit test
 */
export const resolveScreenshotFilename = <Context extends ScreenshotContext>(
  output: Required<ScreenshotOutputOptions<Context>>,
  context: Context,
): string => {
  if (typeof output.file === 'string') {
    return Object.entries(context).reduce(
      (acc, [key, value]) => acc.replaceAll(`[${key}]`, value),
      output.file,
    );
  }

  return output.file(context);
};

const JPEG_EXTENSIONS = new Set([
  '.jpeg',
  '.jpg',
  '.jpe',
  '.jfif',
  '.jfi',
  '.jif',
]);

export type RetakeScreenshotTakeFn<T> = () => Promise<T>;
export type RetakeScreenshotHashFn<T> = (data: T) => Promise<string>;

/**
 * Retakes screenshot until two consecutive captures produce identical images
 * TODO: unit test
 */
export const retakeScreenshotIfNeeded = async <T>(
  take: RetakeScreenshotTakeFn<T>,
  hash: RetakeScreenshotHashFn<T>,
  options: RequiredDeep<ScreenshotFlakinessOptions>,
): Promise<T> => {
  if (!options.retake.enabled) {
    return await take();
  }

  let latest = '';
  for (let i = 0; i < options.retake.retries; i++) {
    const data = await take();
    const base64 = await hash(data);
    if (base64 === latest) {
      return data;
    } else {
      if (latest !== '') {
        await sleep(options.retake.interval);
      }
      latest = base64;
    }
  }

  throw new RetakeExceededError('Failed to capture stable screenshot');
};

/**
 * Adapter interface that bridges platform-specific implementations with core screenshot logic
 */
export type ScreenshotAdapter<
  Page,
  TContext,
  SContext extends ScreenshotContext,
> = {
  /**
   * Creates screenshot context from test framework context
   */
  createContext: (context: TContext) => SContext;

  /**
   * Extracts screenshot parameters from page and test context
   */
  getParameters: (
    page: Page,
    context: TContext,
  ) => Promise<ScreenshotParameters> | ScreenshotParameters;

  /**
   * Resolves absolute filepath for screenshot output
   */
  resolveFilepath: (context: SContext) => Promise<string>;

  /**
   * Creates hash from screenshot data for duplicate detection
   */
  createHash: (data: any) => Promise<string>;

  /**
   * Waits for page metrics to stabilize before screenshot capture
   */
  waitForStable: (
    page: Page,
    context: SContext,
    options: { enabled: boolean; retries: number },
  ) => Promise<void>;

  /**
   * Takes actual screenshot with specified options
   */
  takeScreenshot: (
    page: Page,
    filepath: string,
    options: RequiredDeep<ScreenshotImageOptions> & { type: 'jpeg' | 'png' },
  ) => Promise<any>;

  /**
   * Creates hook that disables animations during screenshot capture
   */
  createAnimationsHook: () => ScreenshotHook<Page, SContext>;

  /**
   * Creates hook that removes elements matching selector
   */
  createRemovalHook: (selector: string) => ScreenshotHook<Page, SContext>;

  /**
   * Creates hook that masks elements with colored overlays
   */
  createMaskingHook: (
    config: Required<ScreenshotMaskConfig>,
  ) => ScreenshotHook<Page, SContext>;
};

/**
 * Creates screenshot function that orchestrates the complete capture workflow with hooks and options
 * TODO: unit test
 */
export const createScreenshotFunction = <
  Page,
  TestContext,
  Context extends ScreenshotContext,
>(
  adapter: ScreenshotAdapter<Page, TestContext, Context>,
) => {
  return async (
    page: Page,
    context: TestContext,
    options: ScreenshotOptions<Page, Context> = {},
  ): Promise<void> => {
    const ctx = adapter.createContext(context);
    const opts = resolveScreenshotOptions(options);
    const rawParams = await adapter.getParameters(page, context);
    const params = resolveScreenshotParameters(rawParams);

    if (params.skip) {
      return;
    }

    const hooks: ScreenshotHook<Page, Context>[] = [
      adapter.createAnimationsHook(),
    ];

    if (params.remove != null) {
      hooks.push(adapter.createRemovalHook(params.remove));
    }

    if (params.mask != null) {
      hooks.push(adapter.createMaskingHook(params.mask));
    }

    const processor = createHookProcessor([...hooks, ...opts.hooks]);

    await processor.setup(page, ctx);

    await adapter.waitForStable(page, ctx, {
      ...opts.flakiness.metrics,
    });

    if (params.delay != null) {
      await sleep(params.delay);
    }

    await processor.preCapture(page, ctx);

    const filepath = await adapter.resolveFilepath(ctx);
    const type = JPEG_EXTENSIONS.has(filepath.slice(filepath.lastIndexOf('.')))
      ? 'jpeg'
      : 'png';

    await retakeScreenshotIfNeeded(
      async () => {
        return adapter.takeScreenshot(page, filepath, {
          ...opts.image,
          type,
        });
      },
      adapter.createHash,
      opts.flakiness,
    );

    await processor.postCapture(page, ctx, filepath);
  };
};

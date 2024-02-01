import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getStoryContext } from '@storybook/test-runner';
import type { TestContext } from '@storybook/test-runner';
import type { Page } from 'playwright';
import { createHookProcessor, type ScreenshotHook } from './hook';
import { createAnimationsHook } from './hooks/animations';
import { createMaskingHook } from './hooks/masking';
import { createRemovalHook } from './hooks/removal';
import type { ScreenshotParameters } from './parameters';
import {
  defaultScreenshotMaskConfig,
  defaultScreenshotParameters,
} from './parameters';
import type { RequiredDeep } from './utils';
import { sleep } from './utils';
import { waitForStable } from './wait-for-stable';
import { RetakeExceededError } from '.';

const JPEG_EXTENSIONS = new Set([
  '.jpeg',
  '.jpg',
  '.jpe',
  '.jfif',
  '.jfi',
  '.jif',
]);

export type ScreenshotOptions = {
  output?: {
    dry?: boolean;
    dir?: string;
    file?: string | ((context: TestContext) => string);
  };
  flakiness?: {
    metrics?: {
      enabled: boolean;
      retries?: number;
    };
    retake?: {
      enabled: boolean;
      interval?: number;
      retries?: number;
    };
  };
  hooks?: ScreenshotHook[];
  fullPage?: boolean;
  omitBackground?: boolean;
  scale?: 'css' | 'device';
};

type ResolvedScreenshotOptions = RequiredDeep<ScreenshotOptions>;

const defaultScreenshotOptions: ResolvedScreenshotOptions = {
  output: {
    dry: false,
    dir: path.join(process.cwd(), '__screenshots__'),
    file: path.join('[title]', '[name].png'),
  },
  flakiness: {
    metrics: {
      enabled: true,
      retries: 1000,
    },
    retake: {
      enabled: true,
      interval: 100,
      retries: 5,
    },
  },
  hooks: [],
  fullPage: true,
  omitBackground: false,
  scale: 'device',
};

const tryScreenshot = async (
  page: Page,
  opts: ResolvedScreenshotOptions & { path: string },
) => {
  const take = async () =>
    page.screenshot({
      animations: 'disabled',
      caret: 'hide',
      fullPage: opts.fullPage,
      omitBackground: opts.omitBackground,
      scale: opts.scale,
      type: JPEG_EXTENSIONS.has(path.extname(opts.path)) ? 'jpeg' : 'png',
    });

  if (!opts.flakiness.retake.enabled) {
    return await take();
  }

  let latest = '';
  for (let i = 0; i < opts.flakiness.retake.retries; i++) {
    const buffer = await take();
    const hash = createHash('sha256').update(buffer).digest('hex');
    if (hash === latest) {
      return buffer;
    } else {
      if (latest !== '') {
        await sleep(opts.flakiness.retake.interval);
      }
      latest = hash;
    }
  }

  throw new RetakeExceededError('Failed to capture stable screenshot');
};

export const screenshot = async (
  page: Page,
  context: TestContext,
  options: ScreenshotOptions = {},
): Promise<Buffer | null> => {
  const { parameters } = await getStoryContext(page, context);

  const opts: ResolvedScreenshotOptions = {
    ...defaultScreenshotOptions,
    ...options,
    output: {
      ...defaultScreenshotOptions.output,
      ...options.output,
    },
    flakiness: {
      metrics: {
        ...defaultScreenshotOptions.flakiness.metrics,
        ...options.flakiness?.metrics,
      },
      retake: {
        ...defaultScreenshotOptions.flakiness.retake,
        ...options.flakiness?.retake,
      },
    },
  };

  const params = {
    ...defaultScreenshotParameters,
    ...((parameters['screenshot'] as ScreenshotParameters | undefined) ?? {}),
  };

  if (params.skip) {
    return null;
  }

  const hooks = [createAnimationsHook()];

  if (params.remove != null) {
    hooks.push(createRemovalHook(params.remove));
  }

  if (params.mask != null) {
    hooks.push(
      createMaskingHook(
        typeof params.mask === 'string'
          ? {
              ...defaultScreenshotMaskConfig,
              selector: params.mask,
            }
          : {
              ...defaultScreenshotMaskConfig,
              ...params.mask,
            },
      ),
    );
  }

  const processor = createHookProcessor([...hooks, ...opts.hooks]);

  await processor.setup(page, context);

  await waitForStable(page, context, {
    ...opts.flakiness.metrics,
  });

  if (params.delay != null) {
    await sleep(params.delay);
  }

  await processor.preCapture(page, context);

  const filename =
    typeof opts.output.file === 'string'
      ? opts.output.file
          .replaceAll('[id]', context.id)
          .replaceAll('[title]', context.title)
          .replaceAll('[name]', context.name)
      : opts.output.file(context);

  const filepath = path.join(opts.output.dir, filename);

  const buffer = await tryScreenshot(page, {
    ...opts,
    path: filepath,
  });

  await processor.postCapture(page, context, {
    buffer,
    path: filepath,
  });

  if (!opts.output.dry) {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, buffer);
  }

  return buffer;
};

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { BrowserCommand } from 'vitest/node';
import type { Plugin } from 'vitest/config';
import {
  resolveScreenshotFilename,
  type ScreenshotOutputOptions,
} from '@storycap-testrun/internal';
import type { BrowserScreenshotContext } from '../context';

export type ResolveScreenshotFilepathParams = [
  context: BrowserScreenshotContext,
];
export type ResolveScreenshotFilepathResult = Promise<string>;
const createResolveScreenshotFilepath =
  (
    output: Required<ScreenshotOutputOptions<BrowserScreenshotContext>>,
  ): BrowserCommand<ResolveScreenshotFilepathParams> =>
  async (_, context): ResolveScreenshotFilepathResult => {
    const filename = resolveScreenshotFilename(output, context);
    return path.join(output.dir, filename);
  };

export type TakeScreenshotParams = [
  filepath: string,
  options: {
    fullPage?: boolean;
    omitBackground?: boolean;
    scale?: 'css' | 'device';
    type?: 'jpeg' | 'png';
  },
];
export type TakeScreenshotResult = Promise<string>;

export type PrepareViewportParams = [];
export type PrepareViewportResult = Promise<void>;

export type RestoreViewportParams = [];
export type RestoreViewportResult = Promise<void>;

// Module-level state to store the original iframe wrapper style between
// prepareViewport and restoreViewport calls within a single capture cycle.
let savedOriginalStyle: string | null = null;

/**
 * Prepares the iframe viewport for screenshot capture.
 * Sets the iframe wrapper to the configured viewport size with `transform: none`.
 * Must be called before any hooks so that mask positions and user hooks
 * see the correct layout dimensions.
 */
const createPrepareViewport =
  (pluginViewport?: {
    width: number;
    height: number;
  }): BrowserCommand<PrepareViewportParams> =>
  async (context): PrepareViewportResult => {
    const viewport = pluginViewport ??
      context.page.viewportSize() ?? { width: 1280, height: 720 };

    savedOriginalStyle = await context.page.evaluate(
      ({ w, h }) => {
        const iframe = document.querySelector(
          'iframe[data-vitest]',
        ) as HTMLIFrameElement | null;
        const wrapper = iframe?.parentElement;
        if (!wrapper) return null;

        const original = wrapper.style.cssText;
        wrapper.style.cssText = `width: ${w}px; height: ${h}px; transform: none; transform-origin: left top;`;
        return original;
      },
      { w: viewport.width, h: viewport.height },
    );
  };

/**
 * Restores the iframe wrapper to its original state after screenshot capture.
 */
const restoreViewport: BrowserCommand<RestoreViewportParams> = async (
  context,
): RestoreViewportResult => {
  if (savedOriginalStyle != null) {
    await context.page.evaluate((css) => {
      const iframe = document.querySelector(
        'iframe[data-vitest]',
      ) as HTMLIFrameElement | null;
      if (iframe?.parentElement) {
        iframe.parentElement.style.cssText = css;
      }
    }, savedOriginalStyle);
    savedOriginalStyle = null;
  }
};

/**
 * Captures a full-page screenshot by scrolling through the iframe and stitching
 * viewport-sized clips using the browser's Canvas API.
 */
async function captureFullPage(
  context: Parameters<BrowserCommand<TakeScreenshotParams>>[0],
  viewport: { width: number; height: number },
  scrollHeight: number,
  options: TakeScreenshotParams[1],
): Promise<Buffer> {
  const chunks: string[] = [];
  const chunkHeights: number[] = [];

  for (let scrollY = 0; scrollY < scrollHeight; scrollY += viewport.height) {
    await context.iframe
      .locator('body')
      .evaluate(
        (body, y) => body.ownerDocument.defaultView?.scrollTo(0, y),
        scrollY,
      );

    const remaining = scrollHeight - scrollY;
    const chunkH = Math.min(viewport.height, remaining);

    const iframeBox = await context.page
      .locator('iframe[data-vitest]')
      .boundingBox();
    if (!iframeBox) {
      throw new Error(
        'Could not determine iframe position for full-page screenshot',
      );
    }

    const chunkBuf = await context.page.screenshot({
      clip: {
        x: iframeBox.x,
        y: iframeBox.y,
        width: iframeBox.width,
        height: chunkH,
      },
      animations: 'disabled',
      caret: 'hide',
      ...(options.omitBackground != null && {
        omitBackground: options.omitBackground,
      }),
      ...(options.scale != null && { scale: options.scale }),
      ...(options.type != null && { type: options.type }),
    });

    chunks.push(Buffer.from(chunkBuf).toString('base64'));
    chunkHeights.push(chunkH);
  }

  // Stitch chunks using browser-native Canvas API (no external dependency)
  const mimeType = options.type === 'jpeg' ? 'image/jpeg' : 'image/png';
  const stitchedB64 = await context.page.evaluate(
    async ({ images, width, heights, mime }) => {
      const totalH = heights.reduce((a, b) => a + b, 0);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d')!;

      let y = 0;
      for (let i = 0; i < images.length; i++) {
        const img = new Image();
        img.src = `data:${mime};base64,${images[i]}`;
        await new Promise<void>((r) => {
          img.onload = () => r();
        });
        ctx.drawImage(img, 0, y);
        y += heights[i] ?? 0;
      }

      return canvas.toDataURL(mime).split(',')[1] ?? '';
    },
    {
      images: chunks,
      width: viewport.width,
      heights: chunkHeights,
      mime: mimeType,
    },
  );

  // Restore scroll position
  await context.iframe
    .locator('body')
    .evaluate((body) => body.ownerDocument.defaultView?.scrollTo(0, 0));

  return Buffer.from(stitchedB64, 'base64');
}

/**
 * Creates a browser command that takes screenshots.
 * The iframe wrapper CSS is already adjusted by prepareViewport before this runs.
 */
const createTakeScreenshot =
  (pluginViewport?: {
    width: number;
    height: number;
  }): BrowserCommand<TakeScreenshotParams> =>
  async (context, filepath, options): TakeScreenshotResult => {
    const viewport = pluginViewport ??
      context.page.viewportSize() ?? { width: 1280, height: 720 };

    let buffer: Buffer;

    if (options.fullPage === false) {
      // Viewport-only capture via clip on the orchestrator page
      await context.page.evaluate(() => window.scrollTo(0, 0));

      const iframeBox = await context.page
        .locator('iframe[data-vitest]')
        .boundingBox();
      if (!iframeBox) {
        throw new Error(
          'Could not determine iframe position for viewport screenshot',
        );
      }

      buffer = Buffer.from(
        await context.page.screenshot({
          animations: 'disabled',
          caret: 'hide',
          clip: {
            x: iframeBox.x,
            y: iframeBox.y,
            width: iframeBox.width,
            height: iframeBox.height,
          },
          ...(options.omitBackground != null && {
            omitBackground: options.omitBackground,
          }),
          ...(options.scale != null && { scale: options.scale }),
          ...(options.type != null && { type: options.type }),
        }),
      );
    } else {
      // Full-page capture: stitch if content exceeds viewport
      const scrollHeight = await context.iframe
        .locator('body')
        .evaluate((body) =>
          Math.max(
            body.scrollHeight,
            body.ownerDocument.documentElement.scrollHeight,
          ),
        );

      if (scrollHeight > viewport.height) {
        buffer = await captureFullPage(
          context,
          viewport,
          scrollHeight,
          options,
        );
      } else {
        const screenshotOptions: Parameters<
          ReturnType<typeof context.iframe.locator>['screenshot']
        >[0] = {
          animations: 'disabled',
          caret: 'hide',
        };
        if (options.omitBackground != null)
          screenshotOptions.omitBackground = options.omitBackground;
        if (options.scale != null) screenshotOptions.scale = options.scale;
        if (options.type != null) screenshotOptions.type = options.type;
        buffer = await context.iframe
          .locator('body')
          .screenshot(screenshotOptions);
      }
    }

    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, buffer);

    return Buffer.from(buffer).toString('base64');
  };

/**
 * Configuration options for Vitest screenshot plugin
 */
export type VitestStorycapPluginOptions = {
  output?: ScreenshotOutputOptions<BrowserScreenshotContext>;
  viewport?: { width: number; height: number };
};

/**
 * Vitest plugin that adds screenshot capture commands to browser context
 */
export default function vitestStorycapPluginOptions(
  options: VitestStorycapPluginOptions = {},
): Plugin {
  const opts = {
    ...options,
    output: {
      dir: path.join(process.cwd(), '__screenshots__'),
      file: path.join('[file]', '[name].png'),
      ...options.output,
    },
  };

  return {
    name: 'vitest:screenshot',
    config() {
      return {
        test: {
          browser: {
            commands: {
              resolveScreenshotFilepath: createResolveScreenshotFilepath(
                opts.output,
              ),
              __storycap_takeScreenshot: createTakeScreenshot(opts.viewport),
              __storycap_prepareViewport: createPrepareViewport(opts.viewport),
              __storycap_restoreViewport: restoreViewport,
            },
          },
        },
      };
    },
  };
}

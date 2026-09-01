import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { BrowserCommand, BrowserCommandContext } from 'vitest/node';
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

type CaptureState = {
  wrapperStyle: string | null;
  previousViewport: { width: number; height: number } | null;
};

// Test files get their own page and run concurrently, so prepareViewport and
// restoreViewport calls interleave. Keying the state by page keeps each capture
// from restoring another page's values.
const captureStates = new WeakMap<
  BrowserCommandContext['page'],
  CaptureState
>();

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

    // Playwright intersects a screenshot `clip` with the browser viewport, so a
    // configured viewport wider or taller than the Playwright context viewport
    // would be silently cropped. Resizing the context keeps layout, clipping
    // and stitching in one coordinate space.
    //
    // A null viewport means emulation is off and the page follows the real
    // window; enabling emulation there cannot be undone, so it only happens for
    // a viewport the caller actually asked for.
    const previousViewport = context.page.viewportSize();
    const resized =
      previousViewport == null
        ? pluginViewport != null
        : previousViewport.width !== viewport.width ||
          previousViewport.height !== viewport.height;

    if (resized) {
      await context.page.setViewportSize(viewport);
    }

    // Recorded before the wrapper is touched so a failure there still leaves
    // restoreViewport able to undo the resize.
    const state: CaptureState = {
      wrapperStyle: null,
      previousViewport: resized ? previousViewport : null,
    };
    captureStates.set(context.page, state);

    state.wrapperStyle = await context.page.evaluate(
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
  const state = captureStates.get(context.page);
  if (state == null) {
    return;
  }
  captureStates.delete(context.page);

  try {
    if (state.wrapperStyle != null) {
      await context.page.evaluate((css) => {
        const iframe = document.querySelector(
          'iframe[data-vitest]',
        ) as HTMLIFrameElement | null;
        if (iframe?.parentElement) {
          iframe.parentElement.style.cssText = css;
        }
      }, state.wrapperStyle);
    }
  } finally {
    // The state is already gone from the map, so a failure above would
    // otherwise leave the page resized for every later capture.
    if (state.previousViewport != null) {
      await context.page.setViewportSize(state.previousViewport);
    }
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
  const totalChunks = Math.ceil(scrollHeight / viewport.height);

  const stickyInfo = await context.iframe.locator('body').evaluate((body) => {
    const doc = body.ownerDocument;
    const view = doc.defaultView!;
    const vh = view.innerHeight;
    const elements = Array.from(doc.querySelectorAll<HTMLElement>('*')).filter(
      (el) => {
        const pos = view.getComputedStyle(el).position;
        return pos === 'fixed' || pos === 'sticky';
      },
    );
    return elements.map((el, i) => {
      el.setAttribute('data-storycap-pinned-id', String(i));
      const rect = el.getBoundingClientRect();
      return {
        id: i,
        anchor: rect.top < vh / 2 ? ('top' as const) : ('bottom' as const),
        originalVisibility: el.style.visibility,
      };
    });
  });

  for (
    let scrollY = 0, chunkIndex = 0;
    scrollY < scrollHeight;
    scrollY += viewport.height, chunkIndex++
  ) {
    const isFirstChunk = chunkIndex === 0;
    const isLastChunk = chunkIndex === totalChunks - 1;

    // The browser clamps a scroll past the bottom, so the requested offset is
    // read back rather than assumed: the last chunk sits at the bottom of the
    // viewport, not at its top.
    const reachedScrollY = await context.iframe.locator('body').evaluate(
      (body, { y, stickyInfo, isFirstChunk, isLastChunk }) => {
        const doc = body.ownerDocument;
        const view = doc.defaultView!;

        for (const { id, anchor } of stickyInfo) {
          const el = doc.querySelector<HTMLElement>(
            `[data-storycap-pinned-id="${id}"]`,
          );
          if (!el) continue;
          const keepVisible =
            (anchor === 'top' && isFirstChunk) ||
            (anchor === 'bottom' && isLastChunk);
          el.style.visibility = keepVisible ? '' : 'hidden';
        }

        // A story that sets `scroll-behavior: smooth` would otherwise leave the
        // read-back on the pre-scroll position.
        view.scrollTo({ top: y, left: 0, behavior: 'instant' });
        return view.scrollY;
      },
      { y: scrollY, stickyInfo, isFirstChunk, isLastChunk },
    );

    const remaining = scrollHeight - scrollY;
    const chunkH = Math.min(viewport.height, remaining);
    const chunkOffset = scrollY - reachedScrollY;

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
        y: iframeBox.y + chunkOffset,
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
  }

  // Restore pinned elements' original visibility and clean up marker attributes.
  await context.iframe.locator('body').evaluate((body, stickyInfo) => {
    const doc = body.ownerDocument;
    for (const { id, originalVisibility } of stickyInfo) {
      const el = doc.querySelector<HTMLElement>(
        `[data-storycap-pinned-id="${id}"]`,
      );
      if (el) {
        el.style.visibility = originalVisibility;
        el.removeAttribute('data-storycap-pinned-id');
      }
    }
  }, stickyInfo);

  // Stitch chunks using browser-native Canvas API (no external dependency)
  const mimeType = options.type === 'jpeg' ? 'image/jpeg' : 'image/png';
  const stitchedB64 = await context.page.evaluate(
    async ({ images, mime }) => {
      // Sizing the canvas from the decoded chunks rather than the CSS-pixel
      // viewport keeps the stitched image correct under a `deviceScaleFactor`
      // other than 1, where each chunk comes back scaled.
      const decoded = await Promise.all(
        images.map(
          (src, index) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = () =>
                reject(
                  new Error(`Failed to decode screenshot chunk ${index}.`),
                );
              img.src = `data:${mime};base64,${src}`;
            }),
        ),
      );

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(...decoded.map((img) => img.naturalWidth));
      canvas.height = decoded.reduce((sum, img) => sum + img.naturalHeight, 0);
      const ctx = canvas.getContext('2d')!;

      let y = 0;
      for (const img of decoded) {
        ctx.drawImage(img, 0, y);
        y += img.naturalHeight;
      }

      // A canvas past the browser's maximum dimensions yields an empty data URL,
      // which would otherwise be written out as a zero-byte screenshot.
      const encoded = canvas.toDataURL(mime).split(',')[1];
      if (!encoded) {
        throw new Error(
          `Failed to encode a ${canvas.width}x${canvas.height} full-page screenshot; the canvas likely exceeds the browser's maximum size.`,
        );
      }
      return encoded;
    },
    { images: chunks, mime: mimeType },
  );

  // Restore scroll position
  await context.iframe.locator('body').evaluate((body) =>
    body.ownerDocument.defaultView?.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    }),
  );

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

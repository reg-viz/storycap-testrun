import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { BrowserCommand } from 'vitest/node';
import type { Plugin } from 'vitest/config';
import {
  resolveScreenshotFilename,
  type ScreenshotOutputOptions,
  type ScreenshotViewportConfig,
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
    omitBackground?: boolean;
    scale?: 'css' | 'device';
    type?: 'jpeg' | 'png';
  },
];
export type TakeScreenshotResult = Promise<string>;

export type ResolveViewportParams = [
  viewportOverride?: ScreenshotViewportConfig | null,
];
export type ResolveViewportResult = Promise<{ width: number; height: number }>;

/**
 * Resolves the viewport a capture is taken at. A per-story override wins over
 * the plugin option, which wins over the live Playwright context viewport.
 * The override is partial, so a story can change only one dimension.
 */
const resolveCaptureViewport = (
  pluginViewport: { width: number; height: number } | undefined,
  pageViewport: { width: number; height: number } | null,
  override: ScreenshotViewportConfig | null | undefined,
): { width: number; height: number } => {
  const base = pluginViewport ?? pageViewport ?? { width: 1280, height: 720 };
  return {
    width: override?.width ?? base.width,
    height: override?.height ?? base.height,
  };
};

/**
 * Reports the viewport the capture should be laid out at. Resolving happens
 * here because the plugin viewport option only exists on the Node side; the
 * tester applies the result to the iframe itself.
 */
const createResolveViewport =
  (pluginViewport?: {
    width: number;
    height: number;
  }): BrowserCommand<ResolveViewportParams> =>
  async (context, viewportOverride): ResolveViewportResult =>
    resolveCaptureViewport(
      pluginViewport,
      context.page.viewportSize(),
      viewportOverride,
    );

/**
 * Creates a browser command that takes screenshots.
 *
 * The tester has already sized the iframe to exactly the region to capture,
 * so this is a plain Playwright element screenshot. Playwright captures
 * beyond the viewport, so an iframe grown past the Playwright context
 * viewport still comes back whole, and no scrolling, tiling or clip
 * arithmetic is needed here.
 */
const createTakeScreenshot =
  (): BrowserCommand<TakeScreenshotParams> =>
  async (context, filepath, options): TakeScreenshotResult => {
    const buffer = await context.page
      .locator('iframe[data-vitest]')
      .screenshot({
        animations: 'disabled',
        caret: 'hide',
        ...(options.omitBackground != null && {
          omitBackground: options.omitBackground,
        }),
        ...(options.scale != null && { scale: options.scale }),
        ...(options.type != null && { type: options.type }),
      });

    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, buffer);

    return buffer.toString('base64');
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
              __storycap_takeScreenshot: createTakeScreenshot(),
              __storycap_resolveViewport: createResolveViewport(opts.viewport),
            },
          },
        },
      };
    },
  };
}

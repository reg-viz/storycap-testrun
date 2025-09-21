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

/**
 * Configuration options for Vitest screenshot plugin
 */
export type VitestStorycapPluginOptions = {
  output?: ScreenshotOutputOptions<BrowserScreenshotContext>;
};

/**
 * Vitest plugin that adds screenshot filepath resolution command to browser context
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
            },
          },
        },
      };
    },
  };
}

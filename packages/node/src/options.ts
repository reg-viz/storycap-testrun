import type {
  ResolvedScreenshotOptions,
  ScreenshotOptions,
  ScreenshotOutputOptions,
} from '@storycap-testrun/internal';
import type { Page } from 'playwright';
import type { NodeScreenshotContext } from './context';

/**
 * Screenshot options for Node.js environment with Playwright
 */
export type NodeScreenshotOptions = ScreenshotOptions<
  Page,
  NodeScreenshotContext
> & {
  output?: ScreenshotOutputOptions<NodeScreenshotContext>;
};

/**
 * Resolved screenshot options for Node.js environment with Playwright
 */
export type NodeResolvedScreenshotOptions = ResolvedScreenshotOptions<
  Page,
  NodeScreenshotContext
>;

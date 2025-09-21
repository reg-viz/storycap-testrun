import type {
  ResolvedScreenshotOptions,
  ScreenshotOptions,
} from '@storycap-testrun/internal';
import type { BrowserPage } from '@vitest/browser/context';
import type { BrowserScreenshotContext } from './context';

/**
 * Screenshot options for Vitest browser environment
 */
export type BrowserScreenshotOptions = ScreenshotOptions<
  BrowserPage,
  BrowserScreenshotContext
>;

/**
 * Resolved screenshot options for Vitest browser environment
 */
export type BrowserResolvedScreenshotOptions = ResolvedScreenshotOptions<
  BrowserPage,
  BrowserScreenshotContext
>;

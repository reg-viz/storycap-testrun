import type { ScreenshotContext } from '@storycap-testrun/internal';

/**
 * Screenshot context for browser environment with test file information
 */
export type BrowserScreenshotContext = ScreenshotContext & {
  file: string;
};

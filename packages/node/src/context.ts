import type { ScreenshotContext } from '@storycap-testrun/internal';

/**
 * Screenshot context for Node.js environment with story title information
 */
export type NodeScreenshotContext = ScreenshotContext & {
  title: string;
};

import type { ScreenshotHook } from '@storycap-testrun/internal';
import type { Page } from 'playwright';
import type { NodeScreenshotContext } from '../context';

/**
 * Screenshot hook type for Node.js environment with Playwright
 */
export type NodeScreenshotHook = ScreenshotHook<Page, NodeScreenshotContext>;

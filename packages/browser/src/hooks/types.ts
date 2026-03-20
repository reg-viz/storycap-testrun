import type { ScreenshotHook } from '@storycap-testrun/internal';
import type { BrowserPage } from 'vitest/browser';
import type { BrowserScreenshotContext } from '../context';

/**
 * Screenshot hook type for Vitest browser environment
 */
export type BrowserScreenshotHook = ScreenshotHook<
  BrowserPage,
  BrowserScreenshotContext
>;

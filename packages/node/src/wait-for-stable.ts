import type { Page } from 'playwright';
import type { NodeScreenshotContext } from './context';
import { waitForStableMetrics as waitForStableMetricsBase } from '@storycap-testrun/internal';
import { waitForPageReady } from '@storybook/test-runner';

const waitForStableMetrics = async (
  page: Page,
  context: NodeScreenshotContext,
  retries: number,
) => {
  const client = await page.context().newCDPSession(page);
  await waitForStableMetricsBase(client, retries, context.id);
};

/**
 * Waits for page to be stable with metrics monitoring (Chromium only) or basic page ready state using Playwright
 */
export const waitForStable = async (
  page: Page,
  context: NodeScreenshotContext,
  {
    enabled,
    retries,
  }: {
    enabled: boolean;
    retries: number;
  },
): Promise<void> => {
  const name = page.context().browser()?.browserType().name();

  if (enabled && name === 'chromium') {
    await waitForPageReady(page);
    await waitForStableMetrics(page, context, retries);
  } else {
    if (enabled) {
      console.warn(
        'Prevention of flakiness through metrics is supported only in Chromium',
      );
    }
    await waitForPageReady(page);
  }
};

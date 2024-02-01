import type { TestContext } from '@storybook/test-runner';
import { waitForPageReady } from '@storybook/test-runner';
import type { Page } from 'playwright';
import { MetricsTimeoutError } from './errors';
import { sleep } from './utils';

const SAME_FRAME_THRESHOLD = 3;

const waitForStableMetrics = async (
  page: Page,
  context: TestContext,
  retries: number,
) => {
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');

  const previous = new Map<string, number[]>();
  const check = (metrics: { name: string; value: number }[], name: string) => {
    const value = metrics.find((metric) => metric.name === name)?.value ?? 0;
    const entry = previous.get(name) ?? [];
    if (entry.length < SAME_FRAME_THRESHOLD) {
      previous.set(name, [...entry, value]);
      return false;
    }
    if (entry.every((v) => v === value)) {
      return true;
    }
    previous.set(name, [...entry.slice(1), value]);
    return false;
  };

  for (let i = 0; i < retries; i++) {
    const { metrics } = await client.send('Performance.getMetrics');
    if (
      check(metrics, 'Nodes') &&
      check(metrics, 'RecalcStyleCount') &&
      check(metrics, 'LayoutCount')
    ) {
      return; // Stable
    }
    await sleep(16);
  }

  throw new MetricsTimeoutError(
    `Metric monitoring was performed ${retries} times, but stability could not be confirmed in "${context.title}/${context.name}".`,
  );
};

export const waitForStable = async (
  page: Page,
  context: TestContext,
  {
    enabled,
    retries,
  }: {
    enabled: boolean;
    retries: number;
  },
) => {
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

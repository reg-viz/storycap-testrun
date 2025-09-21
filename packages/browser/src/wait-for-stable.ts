import type { ScreenshotContext } from '@storycap-testrun/internal';
import { waitForStableMetrics as waitForStableMetricsBase } from '@storycap-testrun/internal';
import { cdp, server } from '@vitest/browser/context';

const waitForStableMetrics = async (
  context: ScreenshotContext,
  retries: number,
) => {
  const client = cdp();
  await waitForStableMetricsBase(client, retries, context.id);
};

const waitForDOMContentLoaded = () => {
  if (document.readyState !== 'loading') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        resolve();
      },
      {
        once: true,
      },
    );
  });
};

const waitForLoad = () => {
  if (document.readyState === 'complete') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    window.addEventListener(
      'load',
      () => {
        resolve();
      },
      { once: true },
    );
  });
};

const waitForNetworkIdle = (timeout = 500) => {
  return new Promise<void>((resolve) => {
    let timer: number | undefined;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        if (timer !== undefined) {
          clearTimeout(timer);
        }
        timer = window.setTimeout(() => {
          observer.disconnect();
          resolve();
        }, timeout);
      }
    });

    observer.observe({ entryTypes: ['resource'] });

    timer = window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeout);
  });
};

/**
 * @see https://github.com/storybookjs/test-runner/blob/7649ac8f6f574453ce4d4bf2db5d8c90cf317524/src/playwright/hooks.ts#L91-L96
 */
const waitForPageReady = async () => {
  await waitForDOMContentLoaded();
  await waitForLoad();
  await waitForNetworkIdle();
  await document.fonts.ready;
};

/**
 * Waits for page to be stable with metrics monitoring (Chromium only) or basic page ready state
 */
export const waitForStable = async (
  context: ScreenshotContext,
  {
    enabled,
    retries,
  }: {
    enabled: boolean;
    retries: number;
  },
): Promise<void> => {
  const name = server.browser;

  if (enabled && name === 'chromium') {
    await waitForPageReady();
    await waitForStableMetrics(context, retries);
  } else {
    if (enabled) {
      console.warn(
        'Prevention of flakiness through metrics is supported only in Chromium',
      );
    }
    await waitForPageReady();
  }
};

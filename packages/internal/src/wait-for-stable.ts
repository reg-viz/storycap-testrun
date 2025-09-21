import { MetricsTimeoutError } from './error';
import { sleep } from './utility';

/**
 * Chrome DevTools Protocol session interface for performance metrics monitoring
 */
export type CDPSession = {
  send(method: 'Performance.enable'): Promise<void>;
  send(method: 'Performance.getMetrics'): Promise<{
    metrics: Array<{ name: string; value: number }>;
  }>;
};

const SAME_FRAME_THRESHOLD = 3;

/**
 * Waits for page metrics to stabilize by monitoring DOM nodes, style recalculations, and layout counts
 */
export const waitForStableMetrics = async (
  session: CDPSession,
  retries: number,
  errorContextId: string,
): Promise<void> => {
  await session.send('Performance.enable');

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
    const { metrics } = await session.send('Performance.getMetrics');
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
    `Metric monitoring was performed ${retries} times, but stability could not be confirmed in "${errorContextId}".`,
  );
};

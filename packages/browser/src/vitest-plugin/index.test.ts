import { describe, test, expect, vi, beforeEach } from 'vitest';
import storycap from './index';

type Viewport = { width: number; height: number };

const getCommands = (options?: Parameters<typeof storycap>[0]) => {
  const plugin = storycap(options) as any;
  return plugin.config().test.browser.commands;
};

const createMockContext = (initialViewport: Viewport | null) => {
  let current = initialViewport;
  const page = {
    viewportSize: vi.fn(() => current),
    setViewportSize: vi.fn(async (viewport: Viewport) => {
      current = viewport;
    }),
    evaluate: vi.fn(async () => 'original-style'),
  };
  return { page } as any;
};

describe('__storycap_prepareViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('resizes to the plugin viewport when it differs from the page', async () => {
    const commands = getCommands({
      viewport: { width: 1366, height: 600 },
    });
    const context = createMockContext({ width: 1280, height: 720 });

    await commands.__storycap_prepareViewport(context);

    expect(context.page.setViewportSize).toHaveBeenCalledWith({
      width: 1366,
      height: 600,
    });
  });

  test('per-story override wins over the plugin viewport', async () => {
    const commands = getCommands({
      viewport: { width: 1366, height: 600 },
    });
    const context = createMockContext({ width: 1366, height: 600 });

    await commands.__storycap_prepareViewport(context, {
      width: 375,
      height: 800,
    });

    expect(context.page.setViewportSize).toHaveBeenCalledWith({
      width: 375,
      height: 800,
    });
  });

  test('partial override keeps the other dimension from the plugin viewport', async () => {
    const commands = getCommands({
      viewport: { width: 1366, height: 600 },
    });
    const context = createMockContext({ width: 1366, height: 600 });

    await commands.__storycap_prepareViewport(context, { height: 800 });

    expect(context.page.setViewportSize).toHaveBeenCalledWith({
      width: 1366,
      height: 800,
    });
  });

  test('partial override falls back to the page viewport without a plugin viewport', async () => {
    const commands = getCommands();
    const context = createMockContext({ width: 1280, height: 720 });

    await commands.__storycap_prepareViewport(context, { height: 800 });

    expect(context.page.setViewportSize).toHaveBeenCalledWith({
      width: 1280,
      height: 800,
    });
  });

  test('does not resize when the override matches the current viewport', async () => {
    const commands = getCommands({
      viewport: { width: 1366, height: 600 },
    });
    const context = createMockContext({ width: 1366, height: 600 });

    await commands.__storycap_prepareViewport(context, { height: 600 });

    expect(context.page.setViewportSize).not.toHaveBeenCalled();
  });

  test('restoreViewport undoes an override resize', async () => {
    const commands = getCommands({
      viewport: { width: 1366, height: 600 },
    });
    const context = createMockContext({ width: 1366, height: 600 });

    await commands.__storycap_prepareViewport(context, { height: 800 });
    await commands.__storycap_restoreViewport(context);

    expect(context.page.setViewportSize).toHaveBeenLastCalledWith({
      width: 1366,
      height: 600,
    });
  });

  test('sizes the iframe wrapper to the resolved viewport', async () => {
    const commands = getCommands({
      viewport: { width: 1366, height: 600 },
    });
    const context = createMockContext({ width: 1366, height: 600 });

    await commands.__storycap_prepareViewport(context, { height: 800 });

    expect(context.page.evaluate).toHaveBeenCalledWith(expect.any(Function), {
      w: 1366,
      h: 800,
    });
  });
});

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
    evaluate: vi.fn(async () => ({
      iframe: 'iframe-style',
      wrapper: 'wrapper-style',
    })),
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

  test('sizes the iframe and its wrapper to the resolved viewport', async () => {
    const commands = getCommands({
      viewport: { width: 1366, height: 600 },
    });
    const context = createMockContext({ width: 1366, height: 600 });

    await commands.__storycap_prepareViewport(context, { height: 800 });

    expect(context.page.evaluate).toHaveBeenCalledWith(expect.any(Function), {
      w: 1366,
      h: 800,
    });

    // Vitest 5 sizes the iframe itself via CSS variables, Vitest 4 sizes the
    // wrapper, so the in-page function has to set both and report both originals.
    const [fn, args] = context.page.evaluate.mock.calls[0];
    const wrapper = { style: { cssText: 'wrapper-original' } };
    const iframe = {
      style: { cssText: 'iframe-original' },
      parentElement: wrapper,
    };
    vi.stubGlobal('document', { querySelector: vi.fn(() => iframe) });
    try {
      expect(fn(args)).toEqual({
        iframe: 'iframe-original',
        wrapper: 'wrapper-original',
      });
    } finally {
      vi.unstubAllGlobals();
    }
    const size =
      'width: 1366px; height: 800px; transform: none; transform-origin: left top;';
    expect(iframe.style.cssText).toBe(size);
    expect(wrapper.style.cssText).toBe(size);
  });

  test('restoreViewport puts the original iframe and wrapper styles back', async () => {
    const commands = getCommands({
      viewport: { width: 1366, height: 600 },
    });
    const context = createMockContext({ width: 1366, height: 600 });

    await commands.__storycap_prepareViewport(context, { height: 800 });
    await commands.__storycap_restoreViewport(context);

    const [fn, styles] = context.page.evaluate.mock.calls[1];
    expect(styles).toEqual({
      iframe: 'iframe-style',
      wrapper: 'wrapper-style',
    });

    const wrapper = { style: { cssText: 'sized' } };
    const iframe = { style: { cssText: 'sized' }, parentElement: wrapper };
    vi.stubGlobal('document', { querySelector: vi.fn(() => iframe) });
    try {
      fn(styles);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(iframe.style.cssText).toBe('iframe-style');
    expect(wrapper.style.cssText).toBe('wrapper-style');
  });
});

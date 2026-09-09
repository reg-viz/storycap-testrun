import { describe, test, expect, vi, beforeEach } from 'vitest';
import storycap from './index';

type Viewport = { width: number; height: number };

const getCommands = (options?: Parameters<typeof storycap>[0]) => {
  const plugin = storycap(options) as any;
  return plugin.config().test.browser.commands;
};

const createMockContext = (pageViewport: Viewport | null) => {
  const screenshot = vi.fn(async () => Buffer.from('png'));
  const page = {
    viewportSize: vi.fn(() => pageViewport),
    locator: vi.fn(() => ({ screenshot })),
  };
  const iframe = {
    locator: vi.fn(() => ({ screenshot })),
  };
  return { context: { page, iframe } as any, screenshot };
};

describe('__storycap_resolveViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('uses the plugin viewport over the page viewport', async () => {
    const commands = getCommands({ viewport: { width: 1366, height: 600 } });
    const { context } = createMockContext({ width: 1280, height: 720 });

    await expect(commands.__storycap_resolveViewport(context)).resolves.toEqual(
      { width: 1366, height: 600 },
    );
  });

  test('per-story override wins over the plugin viewport', async () => {
    const commands = getCommands({ viewport: { width: 1366, height: 600 } });
    const { context } = createMockContext({ width: 1366, height: 600 });

    await expect(
      commands.__storycap_resolveViewport(context, { width: 375, height: 800 }),
    ).resolves.toEqual({ width: 375, height: 800 });
  });

  test('partial override keeps the other dimension from the plugin viewport', async () => {
    const commands = getCommands({ viewport: { width: 1366, height: 600 } });
    const { context } = createMockContext({ width: 1366, height: 600 });

    await expect(
      commands.__storycap_resolveViewport(context, { height: 800 }),
    ).resolves.toEqual({ width: 1366, height: 800 });
  });

  test('partial override falls back to the page viewport without a plugin viewport', async () => {
    const commands = getCommands();
    const { context } = createMockContext({ width: 1280, height: 720 });

    await expect(
      commands.__storycap_resolveViewport(context, { height: 800 }),
    ).resolves.toEqual({ width: 1280, height: 800 });
  });

  test('falls back to a default when neither a plugin nor a page viewport exists', async () => {
    const commands = getCommands();
    const { context } = createMockContext(null);

    await expect(commands.__storycap_resolveViewport(context)).resolves.toEqual(
      { width: 1280, height: 720 },
    );
  });
});

describe('__storycap_takeScreenshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('captures the iframe element, which the tester already sized', async () => {
    const commands = getCommands();
    const { context } = createMockContext({ width: 1280, height: 720 });

    await commands.__storycap_takeScreenshot(
      context,
      `${process.cwd()}/__screenshots__/tmp/iframe.png`,
      { type: 'png' },
    );

    expect(context.page.locator).toHaveBeenCalledWith('iframe[data-vitest]');
    expect(context.iframe.locator).not.toHaveBeenCalled();
  });

  test('forwards image options and omits the ones left unset', async () => {
    const commands = getCommands();
    const { context, screenshot } = createMockContext({
      width: 1280,
      height: 720,
    });

    await commands.__storycap_takeScreenshot(
      context,
      `${process.cwd()}/__screenshots__/tmp/options.png`,
      { type: 'jpeg', scale: 'css' },
    );

    expect(screenshot).toHaveBeenCalledWith({
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      type: 'jpeg',
    });
    expect(context.page.locator).toHaveBeenCalled();
  });
});

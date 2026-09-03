import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createBrowserScreenshotAdapter } from './screenshot';
import type { BrowserPage } from 'vitest/browser';
import type { TestContext } from 'vitest';

// Mock the Vitest browser commands
vi.mock('vitest/browser', () => ({
  commands: {
    resolveScreenshotFilepath: vi
      .fn()
      .mockResolvedValue('/test/screenshot.png'),
    __storycap_takeScreenshot: vi
      .fn()
      .mockResolvedValue('base64-screenshot-data'),
    __storycap_prepareViewport: vi.fn().mockResolvedValue(undefined),
    __storycap_restoreViewport: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock the hook modules
vi.mock('./hooks/animation', () => ({
  createAnimationsHook: vi.fn().mockReturnValue({ setup: vi.fn() }),
}));

vi.mock('./hooks/removal', () => ({
  createRemovalHook: vi.fn().mockReturnValue({ setup: vi.fn() }),
}));

vi.mock('./hooks/masking', () => ({
  createMaskingHook: vi.fn().mockReturnValue({ setup: vi.fn() }),
}));

vi.mock('./wait-for-stable', () => ({
  waitForStable: vi.fn().mockResolvedValue(undefined),
}));

// Mock crypto.subtle for hash function
Object.defineProperty(global, 'window', {
  value: {
    crypto: {
      subtle: {
        digest: vi.fn().mockImplementation(() => {
          const buffer = new ArrayBuffer(32);
          const view = new Uint8Array(buffer);
          view.fill(0x42); // Fill with 0x42 for consistent hash
          return Promise.resolve(buffer);
        }),
      },
    },
  },
  configurable: true,
});

Object.defineProperty(global, 'atob', {
  value: vi.fn().mockImplementation((data: string) => {
    return Buffer.from(data, 'base64').toString('binary');
  }),
  configurable: true,
});

describe('createBrowserScreenshotAdapter', () => {
  type TestContextWithStory = TestContext & {
    story: {
      id: string;
      storyName: string;
      parameters: Record<string, any>;
    };
  };

  let mockPage: BrowserPage;
  let mockContext: TestContextWithStory;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPage = {
      screenshot: vi.fn().mockResolvedValue({ base64: 'base64screenshot' }),
    } as any;

    mockContext = {
      story: {
        id: 'button--primary',
        storyName: 'Primary Button',
        parameters: {
          screenshot: { delay: 100 },
        },
      },
      task: {
        file: {
          name: 'Button.stories.tsx',
        },
      },
    } as any;
  });

  test('should create context correctly', () => {
    const adapter = createBrowserScreenshotAdapter();
    const context = adapter.createContext(mockContext);

    expect(context).toEqual({
      id: 'button--primary',
      name: 'Primary Button',
      file: 'Button.stories.tsx',
    });
  });

  test('should get parameters from story', () => {
    const adapter = createBrowserScreenshotAdapter();
    const parameters = adapter.getParameters(mockPage, mockContext);

    expect(parameters).toEqual({ delay: 100 });
  });

  test('should return empty object when no screenshot parameters', () => {
    const contextWithoutParams = {
      ...mockContext,
      story: {
        ...mockContext.story,
        parameters: {},
      },
    };

    const adapter = createBrowserScreenshotAdapter();
    const parameters = adapter.getParameters(mockPage, contextWithoutParams);

    expect(parameters).toEqual({});
  });

  test('should resolve filepath using commands', async () => {
    const { commands } = await import('vitest/browser');
    const adapter = createBrowserScreenshotAdapter();
    const context = { id: 'test-id', name: 'test-name', file: 'test.ts' };

    const filepath = await adapter.resolveFilepath(context);

    expect(commands.resolveScreenshotFilepath).toHaveBeenCalledWith(context);
    expect(filepath).toBe('/test/screenshot.png');
  });

  test('should create hash from base64 data', async () => {
    const adapter = createBrowserScreenshotAdapter();
    const testData = 'dGVzdGRhdGE='; // 'testdata' in base64

    const hash = await adapter.createHash(testData);

    expect(global.atob).toHaveBeenCalledWith(testData);
    expect(global.window.crypto.subtle.digest).toHaveBeenCalledWith(
      'SHA-256',
      expect.any(Uint8Array),
    );
    expect(hash).toBe(
      '4242424242424242424242424242424242424242424242424242424242424242',
    );
  });

  test('should wait for stable using waitForStable', async () => {
    const { waitForStable } = await import('./wait-for-stable.js');
    const adapter = createBrowserScreenshotAdapter();
    const context = { id: 'test-id', name: 'test-name', file: 'test.ts' };
    const options = { enabled: true, retries: 100 };

    await adapter.waitForStable(mockPage, context, options);

    expect(waitForStable).toHaveBeenCalledWith(context, options);
  });

  test('should take screenshot via browser command', async () => {
    const { commands } = await import('vitest/browser');
    const adapter = createBrowserScreenshotAdapter();
    const filepath = '/test/screenshot.png';
    const options = {
      fullPage: true,
      omitBackground: false,
      scale: 'device' as const,
      type: 'png' as const,
      viewport: null,
    };

    const result = await adapter.takeScreenshot(mockPage, filepath, options);

    expect(commands.__storycap_takeScreenshot).toHaveBeenCalledWith(filepath, {
      fullPage: true,
      omitBackground: false,
      scale: 'device',
      type: 'png',
      viewport: null,
    });
    expect(result).toBe('base64-screenshot-data');
  });

  test('should take JPEG screenshot via browser command', async () => {
    const { commands } = await import('vitest/browser');
    const adapter = createBrowserScreenshotAdapter();
    const filepath = '/test/screenshot.jpg';
    const options = {
      fullPage: false,
      omitBackground: true,
      scale: 'css' as const,
      type: 'jpeg' as const,
      viewport: null,
    };

    await adapter.takeScreenshot(mockPage, filepath, options);

    expect(commands.__storycap_takeScreenshot).toHaveBeenCalledWith(filepath, {
      fullPage: false,
      omitBackground: true,
      scale: 'css',
      type: 'jpeg',
      viewport: null,
    });
  });

  test('should forward per-story viewport override to browser commands', async () => {
    const { commands } = await import('vitest/browser');
    const adapter = createBrowserScreenshotAdapter();
    const context = { id: 'test-id', name: 'test-name', file: 'test.ts' };
    const viewport = { height: 800 };

    await adapter.prepareCapture?.(mockPage, context, viewport);

    expect(commands.__storycap_prepareViewport).toHaveBeenCalledWith(viewport);

    await adapter.takeScreenshot(mockPage, '/test/screenshot.png', {
      fullPage: true,
      omitBackground: false,
      scale: 'device',
      type: 'png',
      viewport,
    });

    expect(commands.__storycap_takeScreenshot).toHaveBeenCalledWith(
      '/test/screenshot.png',
      {
        fullPage: true,
        omitBackground: false,
        scale: 'device',
        type: 'png',
        viewport,
      },
    );
  });

  test('should return hook creation functions', async () => {
    const { createAnimationsHook } = await import('./hooks/animation.js');
    const { createRemovalHook } = await import('./hooks/removal.js');
    const { createMaskingHook } = await import('./hooks/masking.js');

    const adapter = createBrowserScreenshotAdapter();

    expect(adapter.createAnimationsHook).toBe(createAnimationsHook);
    expect(adapter.createRemovalHook).toBe(createRemovalHook);
    expect(adapter.createMaskingHook).toBe(createMaskingHook);
  });
});

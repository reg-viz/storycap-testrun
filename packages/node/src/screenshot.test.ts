import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createNodeScreenshotAdapter } from './screenshot';
import type { Page } from 'playwright';
import type { TestContext } from '@storybook/test-runner';

// Mock the dependencies
vi.mock('@storybook/test-runner', () => ({
  getStoryContext: vi.fn().mockResolvedValue({
    parameters: {
      screenshot: { delay: 200 },
    },
  }),
}));

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

vi.mock('node:crypto', () => ({
  createHash: vi.fn().mockImplementation(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('sha256hash'),
  })),
}));

vi.mock('node:path', () => ({
  join: vi.fn().mockImplementation((...args) => args.join('/')),
}));

describe('createNodeScreenshotAdapter', () => {
  let mockPage: Page;
  let mockContext: TestContext;
  let mockOutput: Required<{ dir: string; file: string }>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPage = {
      screenshot: vi.fn().mockResolvedValue(Buffer.from('screenshot-data')),
    } as any;

    mockContext = {
      id: 'button--primary',
      title: 'Example/Button',
      name: 'Primary',
    } as any;

    mockOutput = {
      dir: '/screenshots',
      file: '[title]/[name].png',
    };
  });

  test('should create context correctly', () => {
    const adapter = createNodeScreenshotAdapter(mockOutput);
    const context = adapter.createContext(mockContext);

    expect(context).toEqual({
      id: 'button--primary',
      title: 'Example/Button',
      name: 'Primary',
    });
  });

  test('should get parameters from getStoryContext', async () => {
    const { getStoryContext } = await import('@storybook/test-runner');
    const adapter = createNodeScreenshotAdapter(mockOutput);

    const parameters = await adapter.getParameters(mockPage, mockContext);

    expect(getStoryContext).toHaveBeenCalledWith(mockPage, mockContext);
    expect(parameters).toEqual({ delay: 200 });
  });

  test('should return empty object when no screenshot parameters', async () => {
    const { getStoryContext } = await import('@storybook/test-runner');
    (getStoryContext as any).mockResolvedValueOnce({
      parameters: {},
    });

    const adapter = createNodeScreenshotAdapter(mockOutput);
    const parameters = await adapter.getParameters(mockPage, mockContext);

    expect(parameters).toEqual({});
  });

  test('should resolve filepath correctly', async () => {
    const path = await import('node:path');
    const adapter = createNodeScreenshotAdapter(mockOutput);
    const context = { id: 'test-id', title: 'Test/Title', name: 'test-name' };

    const filepath = await adapter.resolveFilepath(context);

    // resolveScreenshotFilename substitutes [title] with 'Test/Title' and [name] with 'test-name'
    expect(path.join).toHaveBeenCalledWith(
      '/screenshots',
      'Test/Title/test-name.png',
    );
    expect(filepath).toBe('/screenshots/Test/Title/test-name.png');
  });

  test('should create hash using Node.js crypto', async () => {
    const crypto = await import('node:crypto');
    const adapter = createNodeScreenshotAdapter(mockOutput);
    const testData = Buffer.from('test-data');

    const hash = await adapter.createHash(testData);

    expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    expect(hash).toBe('sha256hash');
  });

  test('should wait for stable using waitForStable', async () => {
    const { waitForStable } = await import('./wait-for-stable.js');
    const adapter = createNodeScreenshotAdapter(mockOutput);
    const context = { id: 'test-id', title: 'Test/Title', name: 'test-name' };
    const options = { enabled: true, retries: 100 };

    await adapter.waitForStable(mockPage, context, options);

    expect(waitForStable).toHaveBeenCalledWith(mockPage, context, options);
  });

  test('should take screenshot with correct options', async () => {
    const adapter = createNodeScreenshotAdapter(mockOutput);
    const filepath = '/test/screenshot.png';
    const options = {
      fullPage: true,
      omitBackground: false,
      scale: 'device' as const,
      type: 'png' as const,
    };

    const result = await adapter.takeScreenshot(mockPage, filepath, options);

    expect(mockPage.screenshot).toHaveBeenCalledWith({
      path: filepath,
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
      omitBackground: false,
      scale: 'device',
      type: 'png',
    });
    expect(result).toEqual(Buffer.from('screenshot-data'));
  });

  test('should take JPEG screenshot', async () => {
    const adapter = createNodeScreenshotAdapter(mockOutput);
    const filepath = '/test/screenshot.jpg';
    const options = {
      fullPage: false,
      omitBackground: true,
      scale: 'css' as const,
      type: 'jpeg' as const,
    };

    await adapter.takeScreenshot(mockPage, filepath, options);

    expect(mockPage.screenshot).toHaveBeenCalledWith({
      path: filepath,
      animations: 'disabled',
      caret: 'hide',
      fullPage: false,
      omitBackground: true,
      scale: 'css',
      type: 'jpeg',
    });
  });

  test('should return hook creation functions', async () => {
    const { createAnimationsHook } = await import('./hooks/animation.js');
    const { createRemovalHook } = await import('./hooks/removal.js');
    const { createMaskingHook } = await import('./hooks/masking.js');

    const adapter = createNodeScreenshotAdapter(mockOutput);

    expect(adapter.createAnimationsHook).toBe(createAnimationsHook);
    expect(adapter.createRemovalHook).toBe(createRemovalHook);
    expect(adapter.createMaskingHook).toBe(createMaskingHook);
  });

  test('should handle different output configurations', () => {
    const customOutput = {
      dir: '/custom/path',
      file: 'custom-[id].png',
    };

    const adapter = createNodeScreenshotAdapter(customOutput);

    // The adapter should store the output configuration for use in resolveFilepath
    expect(adapter).toBeDefined();
    expect(typeof adapter.resolveFilepath).toBe('function');
  });
});

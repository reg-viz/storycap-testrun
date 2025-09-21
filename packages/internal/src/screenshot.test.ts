import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  resolveScreenshotOptions,
  resolveScreenshotFilename,
  retakeScreenshotIfNeeded,
  createScreenshotFunction,
  type ScreenshotOptions,
  type ScreenshotAdapter,
} from './screenshot';
import { RetakeExceededError } from './error';
import type { ScreenshotContext } from './context';

describe('resolveScreenshotOptions', () => {
  test.each([
    {
      input: {},
      expected: {
        flakiness: {
          metrics: { enabled: true, retries: 1000 },
          retake: { enabled: true, interval: 100, retries: 10 },
        },
        hooks: [],
        image: { fullPage: true, omitBackground: false, scale: 'device' },
      },
    },
    {
      input: { hooks: [{ setup: vi.fn() }] },
      expected: {
        flakiness: {
          metrics: { enabled: true, retries: 1000 },
          retake: { enabled: true, interval: 100, retries: 10 },
        },
        hooks: [{ setup: expect.any(Function) }],
        image: { fullPage: true, omitBackground: false, scale: 'device' },
      },
    },
    {
      input: {
        flakiness: { metrics: { enabled: false }, retake: { retries: 5 } },
        image: { fullPage: false, scale: 'css' as const },
      },
      expected: {
        flakiness: {
          metrics: { enabled: false, retries: 1000 },
          retake: { enabled: true, interval: 100, retries: 5 },
        },
        hooks: [],
        image: { fullPage: false, omitBackground: false, scale: 'css' },
      },
    },
  ])('should resolve options correctly', ({ input, expected }) => {
    const result = resolveScreenshotOptions(
      input as ScreenshotOptions<any, any>,
    );
    expect(result).toEqual(expected);
  });
});

describe('resolveScreenshotFilename', () => {
  const mockContext = {
    id: 'story-123',
    name: 'example',
    file: 'test.stories.tsx',
  };

  test('should substitute placeholders in string filename', () => {
    const output = { dir: '/test', file: '[id]/[name].png' };
    const result = resolveScreenshotFilename(output, mockContext);
    expect(result).toBe('story-123/example.png');
  });

  test('should handle multiple same placeholders', () => {
    const output = { dir: '/test', file: '[name]-[name].png' };
    const result = resolveScreenshotFilename(output, mockContext);
    expect(result).toBe('example-example.png');
  });

  test('should handle missing placeholders', () => {
    const output = { dir: '/test', file: '[id]-[missing].png' };
    const result = resolveScreenshotFilename(output, mockContext);
    expect(result).toBe('story-123-[missing].png');
  });

  test('should call function filename with context', () => {
    const fileFn = vi.fn().mockReturnValue('custom-filename.png');
    const output = { dir: '/test', file: fileFn };
    const result = resolveScreenshotFilename(output, mockContext);

    expect(fileFn).toHaveBeenCalledWith(mockContext);
    expect(result).toBe('custom-filename.png');
  });
});

describe('retakeScreenshotIfNeeded', () => {
  let takeFn: ReturnType<typeof vi.fn>;
  let hashFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    takeFn = vi.fn();
    hashFn = vi.fn();
  });

  test('should return immediately when retake is disabled', async () => {
    const mockData = 'screenshot-data';
    takeFn.mockResolvedValue(mockData);

    const options = {
      retake: { enabled: false, interval: 100, retries: 10 },
      metrics: { enabled: true, retries: 1000 },
    };

    const result = await retakeScreenshotIfNeeded(takeFn, hashFn, options);

    expect(result).toBe(mockData);
    expect(takeFn).toHaveBeenCalledTimes(1);
    expect(hashFn).not.toHaveBeenCalled();
  });

  test('should return on first attempt when hashes match', async () => {
    const mockData = 'screenshot-data';
    takeFn.mockResolvedValue(mockData);
    hashFn.mockResolvedValue('hash123');

    const options = {
      retake: { enabled: true, interval: 100, retries: 10 },
      metrics: { enabled: true, retries: 1000 },
    };

    const result = await retakeScreenshotIfNeeded(takeFn, hashFn, options);

    expect(result).toBe(mockData);
    expect(takeFn).toHaveBeenCalledTimes(2);
    expect(hashFn).toHaveBeenCalledTimes(2);
  });

  test('should retry until stable when hashes differ', async () => {
    const mockData = 'screenshot-data';
    takeFn.mockResolvedValue(mockData);
    hashFn
      .mockResolvedValueOnce('hash1')
      .mockResolvedValueOnce('hash2')
      .mockResolvedValueOnce('hash2');

    const options = {
      retake: { enabled: true, interval: 10, retries: 10 },
      metrics: { enabled: true, retries: 1000 },
    };

    const result = await retakeScreenshotIfNeeded(takeFn, hashFn, options);

    expect(result).toBe(mockData);
    expect(takeFn).toHaveBeenCalledTimes(3);
    expect(hashFn).toHaveBeenCalledTimes(3);
  });

  test('should throw RetakeExceededError when retries exhausted', async () => {
    const mockData = 'screenshot-data';
    takeFn.mockResolvedValue(mockData);

    // Each call should return a different hash to simulate unstable screenshots
    let callCount = 0;
    hashFn.mockImplementation(() => Promise.resolve(`hash${++callCount}`));

    const options = {
      retake: { enabled: true, interval: 10, retries: 2 },
      metrics: { enabled: true, retries: 1000 },
    };

    await expect(
      retakeScreenshotIfNeeded(takeFn, hashFn, options),
    ).rejects.toThrow(RetakeExceededError);

    expect(takeFn).toHaveBeenCalledTimes(2);
  });
});

describe('createScreenshotFunction', () => {
  type MockPage = { id: string };
  type MockTestContext = { testId: string };
  type MockScreenshotContext = ScreenshotContext & { testId: string };

  let mockAdapter: ScreenshotAdapter<
    MockPage,
    MockTestContext,
    MockScreenshotContext
  >;

  beforeEach(() => {
    mockAdapter = {
      createContext: vi.fn().mockReturnValue({
        id: 'test-id',
        name: 'test-name',
        testId: 'context-test',
      }),
      getParameters: vi.fn().mockResolvedValue({}),
      resolveFilepath: vi.fn().mockResolvedValue('/test/screenshot.png'),
      createHash: vi.fn().mockResolvedValue('stable-hash'),
      waitForStable: vi.fn().mockResolvedValue(undefined),
      takeScreenshot: vi.fn().mockResolvedValue('screenshot-data'),
      createAnimationsHook: vi.fn().mockReturnValue({ setup: vi.fn() }),
      createRemovalHook: vi.fn().mockReturnValue({ setup: vi.fn() }),
      createMaskingHook: vi.fn().mockReturnValue({ setup: vi.fn() }),
    };
  });

  test('should skip screenshot when parameters.skip is true', async () => {
    mockAdapter.getParameters = vi.fn().mockResolvedValue({ skip: true });

    const screenshotFn = createScreenshotFunction(mockAdapter);
    const mockPage = { id: 'page-1' };
    const mockContext = { testId: 'test-1' };

    await screenshotFn(mockPage, mockContext);

    expect(mockAdapter.takeScreenshot).not.toHaveBeenCalled();
    expect(mockAdapter.resolveFilepath).not.toHaveBeenCalled();
  });

  test('should execute complete screenshot workflow', async () => {
    const screenshotFn = createScreenshotFunction(mockAdapter);
    const mockPage = { id: 'page-1' };
    const mockContext = { testId: 'test-1' };

    await screenshotFn(mockPage, mockContext);

    expect(mockAdapter.createContext).toHaveBeenCalledWith(mockContext);
    expect(mockAdapter.getParameters).toHaveBeenCalledWith(
      mockPage,
      mockContext,
    );
    expect(mockAdapter.waitForStable).toHaveBeenCalled();
    expect(mockAdapter.resolveFilepath).toHaveBeenCalled();
    expect(mockAdapter.takeScreenshot).toHaveBeenCalledWith(
      mockPage,
      '/test/screenshot.png',
      expect.objectContaining({ type: 'png' }),
    );
  });

  test('should add removal hook when remove parameter is provided', async () => {
    mockAdapter.getParameters = vi
      .fn()
      .mockResolvedValue({ remove: '.selector' });

    const screenshotFn = createScreenshotFunction(mockAdapter);
    const mockPage = { id: 'page-1' };
    const mockContext = { testId: 'test-1' };

    await screenshotFn(mockPage, mockContext);

    expect(mockAdapter.createRemovalHook).toHaveBeenCalledWith('.selector');
  });

  test('should add masking hook when mask parameter is provided', async () => {
    const maskConfig = { selector: '.mask', color: '#ff0000' };
    mockAdapter.getParameters = vi.fn().mockResolvedValue({ mask: maskConfig });

    const screenshotFn = createScreenshotFunction(mockAdapter);
    const mockPage = { id: 'page-1' };
    const mockContext = { testId: 'test-1' };

    await screenshotFn(mockPage, mockContext);

    expect(mockAdapter.createMaskingHook).toHaveBeenCalledWith(maskConfig);
  });

  test('should determine JPEG type from file extension', async () => {
    mockAdapter.resolveFilepath = vi
      .fn()
      .mockResolvedValue('/test/screenshot.jpg');

    const screenshotFn = createScreenshotFunction(mockAdapter);
    const mockPage = { id: 'page-1' };
    const mockContext = { testId: 'test-1' };

    await screenshotFn(mockPage, mockContext);

    expect(mockAdapter.takeScreenshot).toHaveBeenCalledWith(
      mockPage,
      '/test/screenshot.jpg',
      expect.objectContaining({ type: 'jpeg' }),
    );
  });

  test('should apply delay when specified', async () => {
    mockAdapter.getParameters = vi.fn().mockResolvedValue({ delay: 100 });

    const screenshotFn = createScreenshotFunction(mockAdapter);
    const mockPage = { id: 'page-1' };
    const mockContext = { testId: 'test-1' };

    const start = Date.now();
    await screenshotFn(mockPage, mockContext);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(90);
  });
});

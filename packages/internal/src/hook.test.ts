import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createHookProcessor, type ScreenshotHook } from './hook';
import type { ScreenshotContext } from './context';

describe('createHookProcessor', () => {
  type MockPage = { id: string };
  type MockContext = ScreenshotContext;

  let mockPage: MockPage;
  let mockContext: MockContext;

  beforeEach(() => {
    mockPage = { id: 'page-1' };
    mockContext = { id: 'test-id', name: 'test-name' };
  });

  test('should execute all hooks in sequence for setup', async () => {
    const setupOrder: number[] = [];
    const hooks: ScreenshotHook<MockPage, MockContext>[] = [
      { setup: vi.fn().mockImplementation(() => setupOrder.push(1)) },
      { setup: vi.fn().mockImplementation(() => setupOrder.push(2)) },
      { setup: vi.fn().mockImplementation(() => setupOrder.push(3)) },
    ];

    const processor = createHookProcessor(hooks);
    await processor.setup(mockPage, mockContext);

    expect(setupOrder).toEqual([1, 2, 3]);
    expect(hooks[0]!.setup).toHaveBeenCalledWith(mockPage, mockContext);
    expect(hooks[1]!.setup).toHaveBeenCalledWith(mockPage, mockContext);
    expect(hooks[2]!.setup).toHaveBeenCalledWith(mockPage, mockContext);
  });

  test('should execute all hooks in sequence for preCapture', async () => {
    const captureOrder: number[] = [];
    const hooks: ScreenshotHook<MockPage, MockContext>[] = [
      { preCapture: vi.fn().mockImplementation(() => captureOrder.push(1)) },
      { preCapture: vi.fn().mockImplementation(() => captureOrder.push(2)) },
      { preCapture: vi.fn().mockImplementation(() => captureOrder.push(3)) },
    ];

    const processor = createHookProcessor(hooks);
    await processor.preCapture(mockPage, mockContext);

    expect(captureOrder).toEqual([1, 2, 3]);
    expect(hooks[0]!.preCapture).toHaveBeenCalledWith(mockPage, mockContext);
    expect(hooks[1]!.preCapture).toHaveBeenCalledWith(mockPage, mockContext);
    expect(hooks[2]!.preCapture).toHaveBeenCalledWith(mockPage, mockContext);
  });

  test('should execute all hooks in sequence for postCapture', async () => {
    const postOrder: number[] = [];
    const filepath = '/test/screenshot.png';
    const hooks: ScreenshotHook<MockPage, MockContext>[] = [
      { postCapture: vi.fn().mockImplementation(() => postOrder.push(1)) },
      { postCapture: vi.fn().mockImplementation(() => postOrder.push(2)) },
      { postCapture: vi.fn().mockImplementation(() => postOrder.push(3)) },
    ];

    const processor = createHookProcessor(hooks);
    await processor.postCapture(mockPage, mockContext, filepath);

    expect(postOrder).toEqual([1, 2, 3]);
    expect(hooks[0]!.postCapture).toHaveBeenCalledWith(
      mockPage,
      mockContext,
      filepath,
    );
    expect(hooks[1]!.postCapture).toHaveBeenCalledWith(
      mockPage,
      mockContext,
      filepath,
    );
    expect(hooks[2]!.postCapture).toHaveBeenCalledWith(
      mockPage,
      mockContext,
      filepath,
    );
  });

  test('should skip undefined hook methods', async () => {
    const hooks: ScreenshotHook<MockPage, MockContext>[] = [
      { setup: vi.fn() },
      {}, // empty hook with no methods
      { preCapture: vi.fn(), postCapture: vi.fn() },
    ];

    const processor = createHookProcessor(hooks);

    await processor.setup(mockPage, mockContext);
    await processor.preCapture(mockPage, mockContext);
    await processor.postCapture(mockPage, mockContext, '/test/file.png');

    expect(hooks[0]!.setup).toHaveBeenCalledTimes(1);
    expect(hooks[2]!.preCapture).toHaveBeenCalledTimes(1);
    expect(hooks[2]!.postCapture).toHaveBeenCalledTimes(1);
  });

  test('should propagate errors from hooks', async () => {
    const error = new Error('Hook error');
    const hooks: ScreenshotHook<MockPage, MockContext>[] = [
      { setup: vi.fn() },
      { setup: vi.fn().mockRejectedValue(error) },
      { setup: vi.fn() }, // should not be called due to error
    ];

    const processor = createHookProcessor(hooks);

    await expect(processor.setup(mockPage, mockContext)).rejects.toThrow(
      'Hook error',
    );

    expect(hooks[0]!.setup).toHaveBeenCalledTimes(1);
    expect(hooks[1]!.setup).toHaveBeenCalledTimes(1);
    expect(hooks[2]!.setup).not.toHaveBeenCalled();
  });

  test('should work with empty hooks array', async () => {
    const hooks: ScreenshotHook<MockPage, MockContext>[] = [];
    const processor = createHookProcessor(hooks);

    // Should not throw errors
    await expect(
      processor.setup(mockPage, mockContext),
    ).resolves.toBeUndefined();
    await expect(
      processor.preCapture(mockPage, mockContext),
    ).resolves.toBeUndefined();
    await expect(
      processor.postCapture(mockPage, mockContext, '/test/file.png'),
    ).resolves.toBeUndefined();
  });

  test('should handle async hooks correctly', async () => {
    const delays: number[] = [];
    const hooks: ScreenshotHook<MockPage, MockContext>[] = [
      {
        setup: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          delays.push(1);
        }),
      },
      {
        setup: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          delays.push(2);
        }),
      },
    ];

    const processor = createHookProcessor(hooks);
    await processor.setup(mockPage, mockContext);

    // Should maintain order despite different async delays
    expect(delays).toEqual([1, 2]);
  });

  test('should handle mixed sync and async hooks', async () => {
    const executionOrder: string[] = [];
    const hooks: ScreenshotHook<MockPage, MockContext>[] = [
      {
        setup: vi.fn().mockImplementation(() => {
          executionOrder.push('sync1');
        }),
      },
      {
        setup: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          executionOrder.push('async');
        }),
      },
      {
        setup: vi.fn().mockImplementation(() => {
          executionOrder.push('sync2');
        }),
      },
    ];

    const processor = createHookProcessor(hooks);
    await processor.setup(mockPage, mockContext);

    expect(executionOrder).toEqual(['sync1', 'async', 'sync2']);
  });
});

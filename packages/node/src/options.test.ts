import { describe, test, expect } from 'vitest';
import type { NodeScreenshotOptions } from './options';

describe('NodeScreenshotOptions type', () => {
  test('should accept minimal configuration', () => {
    const options: NodeScreenshotOptions = {};
    expect(options).toBeDefined();
  });

  test('should accept configuration with hooks', () => {
    const options: NodeScreenshotOptions = {
      hooks: [
        {
          setup: async () => {},
          preCapture: async () => {},
          postCapture: async () => {},
        },
      ],
    };
    expect(options.hooks).toHaveLength(1);
  });

  test('should accept configuration with output options', () => {
    const options: NodeScreenshotOptions = {
      output: {
        dir: './screenshots',
        file: 'test.png',
      },
    };
    expect(options.output?.dir).toBe('./screenshots');
    expect(options.output?.file).toBe('test.png');
  });
});

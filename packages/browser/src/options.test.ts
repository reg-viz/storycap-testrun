import { describe, test, expect } from 'vitest';
import type { BrowserScreenshotOptions } from './options';

describe('BrowserScreenshotOptions type', () => {
  test('should accept minimal configuration', () => {
    const options: BrowserScreenshotOptions = {};
    expect(options).toBeDefined();
  });

  test('should accept configuration with hooks', () => {
    const options: BrowserScreenshotOptions = {
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
});

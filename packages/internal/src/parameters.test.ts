import { describe, test, expect } from 'vitest';
import { resolveScreenshotParameters } from './parameters';

describe('resolveScreenshotParameters', () => {
  test('should return default parameters when no input provided', () => {
    const result = resolveScreenshotParameters();

    expect(result).toEqual({
      skip: false,
      delay: null,
      mask: null,
      remove: null,
    });
  });

  test('should override defaults with provided parameters', () => {
    const result = resolveScreenshotParameters({
      skip: true,
      delay: 1000,
      remove: '.selector',
    });

    expect(result).toEqual({
      skip: true,
      delay: 1000,
      mask: null,
      remove: '.selector',
    });
  });

  test('should convert string mask to mask config', () => {
    const result = resolveScreenshotParameters({
      mask: '.mask-selector',
    });

    expect(result.mask).toEqual({
      selector: '.mask-selector',
      color: '#ff00ff',
    });
  });

  test('should merge partial mask config with defaults', () => {
    const result = resolveScreenshotParameters({
      mask: {
        selector: '.custom-selector',
      },
    });

    expect(result.mask).toEqual({
      selector: '.custom-selector',
      color: '#ff00ff',
    });
  });

  test('should allow custom mask color', () => {
    const result = resolveScreenshotParameters({
      mask: {
        selector: '.custom-selector',
        color: '#00ff00',
      },
    });

    expect(result.mask).toEqual({
      selector: '.custom-selector',
      color: '#00ff00',
    });
  });
});

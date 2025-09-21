import { describe, test, expect } from 'vitest';
import { MetricsTimeoutError, RetakeExceededError } from './error';

describe('MetricsTimeoutError', () => {
  test('should be instance of Error', () => {
    const error = new MetricsTimeoutError('Test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('MetricsTimeoutError');
    expect(error.message).toBe('Test message');
  });
});

describe('RetakeExceededError', () => {
  test('should be instance of Error', () => {
    const error = new RetakeExceededError('Test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RetakeExceededError');
    expect(error.message).toBe('Test message');
  });
});

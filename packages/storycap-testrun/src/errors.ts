export class MetricsTimeoutError extends Error {
  static {
    this.prototype.name = 'MetricsTimeoutError';
  }
}

export class RetakeExceededError extends Error {
  static {
    this.prototype.name = 'RetakeExceededError';
  }
}

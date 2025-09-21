/**
 * Thrown when page metrics monitoring exceeds retry limit without achieving stability
 */
export class MetricsTimeoutError extends Error {
  static {
    this.prototype.name = 'MetricsTimeoutError';
  }
}

/**
 * Thrown when screenshot retake attempts exceed retry limit without getting identical images
 */
export class RetakeExceededError extends Error {
  static {
    this.prototype.name = 'RetakeExceededError';
  }
}

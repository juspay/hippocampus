export class HippocampusError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'HippocampusError';
  }

  static fromResponse(status: number, body: unknown): HippocampusError {
    if (body && typeof body === 'object' && 'error' in body) {
      const err = (body as { error: { message?: string; details?: unknown } }).error;
      return new HippocampusError(status, err.message || 'Unknown error', err.details);
    }
    return new HippocampusError(status, `HTTP ${status}`);
  }
}

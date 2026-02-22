import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { RateLimiter, rateLimiter, withRateLimit, estimateTokensForRequest } from './rateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    RateLimiter.resetInstance();
    limiter = RateLimiter.getInstance();
  });

  afterEach(() => {
    RateLimiter.resetInstance();
  });

  it('is a singleton', () => {
    const instance1 = RateLimiter.getInstance();
    const instance2 = RateLimiter.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('can proceed when tokens available', () => {
    const canProceed = limiter.canProceed('gemini-2.0-flash-001', 100);
    expect(canProceed).toBe(true);
  });

  it('consumes tokens after operation', () => {
    const model = 'gemini-2.0-flash-001';
    const tokensBefore = limiter.getStats().models[model]?.availableTokens;
    
    limiter.consume(model, 1000);
    
    const tokensAfter = limiter.getStats().models[model]?.availableTokens;
    expect(tokensAfter).toBeLessThan(tokensBefore!);
  });

  it('estimates token cost from text', () => {
    const text = 'a'.repeat(1000);
    const tokens = limiter.estimateTokenCost(text);
    expect(tokens).toBe(250);
  });

  it('estimates token cost from object', () => {
    const obj = { text: 'hello world' };
    const tokens = limiter.estimateTokenCost(obj);
    expect(tokens).toBeGreaterThan(0);
  });

  it('tracks statistics', () => {
    const model = 'gemini-2.0-flash-001';
    limiter.consume(model, 1000);
    limiter.consume(model, 500);
    
    const stats = limiter.getStats();
    expect(stats.models[model].totalRequests).toBe(2);
    expect(stats.models[model].totalTokensConsumed).toBe(1500);
  });

  it('can be reset', () => {
    RateLimiter.resetInstance();
    const newLimiter = RateLimiter.getInstance();
    expect(newLimiter).not.toBe(limiter);
  });
});

describe('estimateTokensForRequest', () => {
  it('estimates tokens from text parts', () => {
    const parts = [
      { text: 'Hello world' },
      { text: 'Another text' },
    ];
    const tokens = estimateTokensForRequest(parts);
    expect(tokens).toBeGreaterThan(0);
  });

  it('handles inline data', () => {
    const parts = [
      { inlineData: { data: 'base64encodeddata' } },
      { text: 'Some text' },
    ];
    const tokens = estimateTokensForRequest(parts);
    expect(tokens).toBeGreaterThan(0);
  });

  it('returns minimum of 100 for empty parts', () => {
    const tokens = estimateTokensForRequest([]);
    expect(tokens).toBe(100);
  });
});

describe('withRateLimit', () => {
  beforeEach(() => {
    RateLimiter.resetInstance();
  });

  afterEach(() => {
    RateLimiter.resetInstance();
  });

  it('executes operation when rate limit allows', async () => {
    const result = await withRateLimit(
      'gemini-2.0-flash-001',
      () => Promise.resolve('success'),
      { estimatedTokens: 100 }
    );
    expect(result).toBe('success');
  });

  it('propagates errors from operation', async () => {
    await expect(
      withRateLimit(
        'gemini-2.0-flash-001',
        () => Promise.reject(new Error('Operation failed')),
        { estimatedTokens: 100 }
      )
    ).rejects.toThrow('Operation failed');
  });
});
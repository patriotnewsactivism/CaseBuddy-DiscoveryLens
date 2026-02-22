import { createHash } from 'crypto';

interface ModelLimits {
  requestsPerMinute: number;
  tokensPerMinute: number;
}

interface BucketState {
  requestTokens: number;
  tokenTokens: number;
  lastRefill: number;
}

interface RateLimiterConfig {
  models: Record<string, ModelLimits>;
  defaultLimits: ModelLimits;
}

interface WaitOptions {
  estimatedTokens?: number;
  maxWaitMs?: number;
}

interface RateLimiterStats {
  models: Record<string, {
    availableRequests: number;
    availableTokens: number;
    totalRequests: number;
    totalTokensConsumed: number;
    totalWaits: number;
    totalWaitTimeMs: number;
  }>;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  models: {
    'gemini-2.0-pro-exp-02-05': { requestsPerMinute: 10, tokensPerMinute: 1000000 },
    'gemini-2.0-flash-001': { requestsPerMinute: 15, tokensPerMinute: 2000000 },
    'gemini-2.0-flash-thinking-exp-1219': { requestsPerMinute: 15, tokensPerMinute: 2000000 },
  },
  defaultLimits: { requestsPerMinute: 10, tokensPerMinute: 500000 },
};

class RateLimiter {
  private static instance: RateLimiter | null = null;
  private buckets: Map<string, BucketState> = new Map();
  private stats: Map<string, { requests: number; tokens: number; waits: number; waitTimeMs: number }> = new Map();
  private config: RateLimiterConfig;

  private constructor(config: RateLimiterConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.initializeBuckets();
  }

  static getInstance(config?: RateLimiterConfig): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter(config);
    }
    return RateLimiter.instance;
  }

  static resetInstance(): void {
    RateLimiter.instance = null;
  }

  private initializeBuckets(): void {
    for (const model of Object.keys(this.config.models)) {
      const limits = this.config.models[model] || this.config.defaultLimits;
      this.buckets.set(model, {
        requestTokens: limits.requestsPerMinute,
        tokenTokens: limits.tokensPerMinute,
        lastRefill: Date.now(),
      });
      this.stats.set(model, { requests: 0, tokens: 0, waits: 0, waitTimeMs: 0 });
    }
  }

  private getLimits(model: string): ModelLimits {
    return this.config.models[model] || this.config.defaultLimits;
  }

  private ensureBucket(model: string): void {
    if (!this.buckets.has(model)) {
      const limits = this.getLimits(model);
      this.buckets.set(model, {
        requestTokens: limits.requestsPerMinute,
        tokenTokens: limits.tokensPerMinute,
        lastRefill: Date.now(),
      });
      this.stats.set(model, { requests: 0, tokens: 0, waits: 0, waitTimeMs: 0 });
    }
  }

  private refill(model: string): void {
    this.ensureBucket(model);
    const bucket = this.buckets.get(model)!;
    const limits = this.getLimits(model);
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefill;
    const elapsedMinutes = elapsedMs / 60000;

    if (elapsedMinutes > 0) {
      bucket.requestTokens = Math.min(
        limits.requestsPerMinute,
        bucket.requestTokens + limits.requestsPerMinute * elapsedMinutes
      );
      bucket.tokenTokens = Math.min(
        limits.tokensPerMinute,
        bucket.tokenTokens + limits.tokensPerMinute * elapsedMinutes
      );
      bucket.lastRefill = now;
    }
  }

  canProceed(model: string, estimatedTokens: number = 1000): boolean {
    this.refill(model);
    const bucket = this.buckets.get(model)!;
    return bucket.requestTokens >= 1 && bucket.tokenTokens >= estimatedTokens;
  }

  async waitForTokens(model: string, options: WaitOptions = {}): Promise<boolean> {
    const { estimatedTokens = 1000, maxWaitMs = 60000 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      this.refill(model);
      const bucket = this.buckets.get(model)!;

      if (bucket.requestTokens >= 1 && bucket.tokenTokens >= estimatedTokens) {
        return true;
      }

      const limits = this.getLimits(model);
      const requestDeficit = Math.max(0, 1 - bucket.requestTokens);
      const tokenDeficit = Math.max(0, estimatedTokens - bucket.tokenTokens);

      const requestWaitMs = (requestDeficit / limits.requestsPerMinute) * 60000;
      const tokenWaitMs = (tokenDeficit / limits.tokensPerMinute) * 60000;
      const waitMs = Math.min(Math.ceil(Math.max(requestWaitMs, tokenWaitMs)), 5000);

      await this.sleep(waitMs);
    }

    return false;
  }

  consume(model: string, tokensUsed: number): void {
    this.refill(model);
    const bucket = this.buckets.get(model)!;
    const bucketTokens = Math.max(0, bucket.requestTokens - 1);
    const tokenTokens = Math.max(0, bucket.tokenTokens - tokensUsed);

    this.buckets.set(model, {
      ...bucket,
      requestTokens: bucketTokens,
      tokenTokens,
    });

    const stats = this.stats.get(model)!;
    this.stats.set(model, {
      ...stats,
      requests: stats.requests + 1,
      tokens: stats.tokens + tokensUsed,
    });
  }

  recordWait(model: string, waitMs: number): void {
    const stats = this.stats.get(model);
    if (stats) {
      this.stats.set(model, {
        ...stats,
        waits: stats.waits + 1,
        waitTimeMs: stats.waitTimeMs + waitMs,
      });
    }
  }

  estimateTokenCost(content: string | object): number {
    let text: string;
    if (typeof content === 'string') {
      text = content;
    } else {
      text = JSON.stringify(content);
    }
    return Math.ceil(text.length / 4);
  }

  getStats(): RateLimiterStats {
    const models: Record<string, RateLimiterStats['models'][string]> = {};

    for (const [model, bucket] of this.buckets.entries()) {
      const stats = this.stats.get(model)!;
      models[model] = {
        availableRequests: Math.floor(bucket.requestTokens),
        availableTokens: Math.floor(bucket.tokenTokens),
        totalRequests: stats.requests,
        totalTokensConsumed: stats.tokens,
        totalWaits: stats.waits,
        totalWaitTimeMs: stats.waitTimeMs,
      };
    }

    return { models };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const rateLimiter = RateLimiter.getInstance();

export const withRateLimit = async <T>(
  model: string,
  operation: () => Promise<T>,
  options: WaitOptions = {}
): Promise<T> => {
  const { estimatedTokens = 1000, maxWaitMs = 60000 } = options;
  const startTime = Date.now();

  const canProceed = await rateLimiter.waitForTokens(model, { estimatedTokens, maxWaitMs });

  if (!canProceed) {
    throw new Error(`Rate limit exceeded for model ${model}. Max wait time ${maxWaitMs}ms exceeded.`);
  }

  const waitTime = Date.now() - startTime;
  if (waitTime > 100) {
    rateLimiter.recordWait(model, waitTime);
  }

  try {
    const result = await operation();
    rateLimiter.consume(model, estimatedTokens);
    return result;
  } catch (error) {
    rateLimiter.consume(model, estimatedTokens);
    throw error;
  }
};

export const estimateTokensForRequest = (parts: unknown[]): number => {
  let totalChars = 0;

  for (const part of parts) {
    if (typeof part === 'object' && part !== null) {
      const p = part as Record<string, unknown>;
      if ('text' in p && typeof p.text === 'string') {
        totalChars += p.text.length;
      } else if ('inlineData' in p && typeof (p.inlineData as { data?: string })?.data === 'string') {
        totalChars += (p.inlineData as { data: string }).data.length;
      }
    }
  }

  return Math.max(100, Math.ceil(totalChars / 3));
};

export { RateLimiter, type ModelLimits, type RateLimiterStats };
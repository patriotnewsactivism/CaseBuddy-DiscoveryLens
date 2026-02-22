import { createHash } from 'crypto';

interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTtlMs: number;
  cleanupIntervalMs?: number;
}

interface PersistenceAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 1000,
  defaultTtlMs: 60 * 60 * 1000,
  cleanupIntervalMs: 60 * 1000,
};

class LRUCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private stats = { hits: 0, misses: 0, evictions: 0 };
  private cleanupTimer: NodeJS.Timeout | null = null;
  private persistenceAdapter: PersistenceAdapter | null = null;
  private pendingPersistenceWrites: Map<string, Promise<void>> = new Map();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (this.config.cleanupIntervalMs && this.config.cleanupIntervalMs > 0) {
      this.startCleanupTimer();
    }
  }

  static hashContent(content: string | Buffer | object): string {
    let input: Buffer;
    if (Buffer.isBuffer(content)) {
      input = content;
    } else if (typeof content === 'string') {
      input = Buffer.from(content, 'utf-8');
    } else {
      input = Buffer.from(JSON.stringify(content), 'utf-8');
    }
    return createHash('sha256').update(input).digest('hex');
  }

  static createKey(...parts: (string | number | boolean | null | undefined)[]): string {
    const normalized = parts.map(p => (p === null ? 'null' : p === undefined ? 'undefined' : String(p)));
    return createHash('sha256').update(normalized.join(':')).digest('hex');
  }

  setPersistenceAdapter(adapter: PersistenceAdapter): void {
    this.persistenceAdapter = adapter;
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.persistenceAdapter) {
        const persisted = await this.persistenceAdapter.get<T>(key);
        if (persisted !== null) {
          this.set(key, persisted);
          this.stats.hits++;
          return persisted;
        }
      }
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccessedAt = now;
    this.stats.hits++;

    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttlMs ?? this.config.defaultTtlMs);

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt,
      accessCount: 0,
      lastAccessedAt: now,
    };

    this.cache.set(key, entry);

    if (this.persistenceAdapter) {
      const existingWrite = this.pendingPersistenceWrites.get(key);
      if (existingWrite) {
        existingWrite.then(() => {
          const write = this.persistenceAdapter!.set(key, value, ttlMs ?? this.config.defaultTtlMs);
          this.pendingPersistenceWrites.set(key, write);
          write.finally(() => this.pendingPersistenceWrites.delete(key));
        });
      } else {
        const write = this.persistenceAdapter.set(key, value, ttlMs ?? this.config.defaultTtlMs);
        this.pendingPersistenceWrites.set(key, write);
        write.finally(() => this.pendingPersistenceWrites.delete(key));
      }
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted && this.persistenceAdapter) {
      this.persistenceAdapter.delete(key).catch(() => {});
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    if (this.persistenceAdapter) {
      this.persistenceAdapter.clear().catch(() => {});
    }
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  private evictLRU(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      this.config.cleanupIntervalMs
    );
  }

  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

class SupabasePersistenceAdapter implements PersistenceAdapter {
  private tableName: string;
  private getSupabase: () => Promise<{
    from: (table: string) => {
      select: (columns: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: unknown | null }> } };
      insert: (data: unknown) => Promise<{ error: unknown }>;
      update: (data: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
      delete: () => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
    };
  }>;

  constructor(
    tableName: string,
    getSupabase: () => Promise<{
      from: (table: string) => {
        select: (columns: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: unknown | null }> } };
        insert: (data: unknown) => Promise<{ error: unknown }>;
        update: (data: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
        delete: () => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
      };
    }>
  ) {
    this.tableName = tableName;
    this.getSupabase = getSupabase;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const supabase = await this.getSupabase();
      const { data } = await supabase
        .from(this.tableName)
        .select('value, expires_at')
        .eq('key', key)
        .single();

      if (!data) return null;

      const record = data as { value: T; expires_at: string };
      if (new Date(record.expires_at) < new Date()) {
        await this.delete(key);
        return null;
      }

      return record.value;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const supabase = await this.getSupabase();

    await supabase
      .from(this.tableName)
      .insert({ key, value, expires_at: expiresAt });
  }

  async delete(key: string): Promise<void> {
    const supabase = await this.getSupabase();
    await supabase
      .from(this.tableName)
      .delete()
      .eq('key', key);
  }

  async clear(): Promise<void> {
    throw new Error('Clear is not supported on Supabase persistence adapter for safety');
  }
}

class AnalysisCache {
  private cache: LRUCache<unknown>;
  private static instance: AnalysisCache | null = null;

  private constructor(config?: Partial<CacheConfig>) {
    this.cache = new LRUCache<unknown>(config);
  }

  static getInstance(config?: Partial<CacheConfig>): AnalysisCache {
    if (!AnalysisCache.instance) {
      AnalysisCache.instance = new AnalysisCache(config);
    }
    return AnalysisCache.instance;
  }

  static resetInstance(): void {
    if (AnalysisCache.instance) {
      AnalysisCache.instance.cache.destroy();
      AnalysisCache.instance = null;
    }
  }

  createAnalysisKey(
    operation: 'analyze' | 'transcribe' | 'chat',
    contentHash: string,
    options?: Record<string, unknown>
  ): string {
    return LRUCache.createKey(operation, contentHash, JSON.stringify(options ?? {}));
  }

  async getCachedAnalysis<T>(key: string): Promise<T | null> {
    return this.cache.get(key) as Promise<T | null>;
  }

  cacheAnalysis<T>(key: string, result: T, ttlMs?: number): void {
    this.cache.set(key, result, ttlMs);
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const analysisCache = AnalysisCache.getInstance();

export { LRUCache, AnalysisCache, SupabasePersistenceAdapter, type CacheStats, type CacheConfig, type PersistenceAdapter };
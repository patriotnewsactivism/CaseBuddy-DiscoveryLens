import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { LRUCache, AnalysisCache } from './cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>({ maxSize: 3, defaultTtlMs: 60000 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('sets and gets values', async () => {
    cache.set('key1', 'value1');
    const result = await cache.get('key1');
    expect(result).toBe('value1');
  });

  it('returns null for missing keys', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('evicts LRU when max size reached', async () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4');

    expect(await cache.get('key1')).toBeNull();
    expect(await cache.get('key4')).toBe('value4');
  });

  it('updates LRU order on access', async () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    await cache.get('key1');
    
    cache.set('key4', 'value4');

    expect(await cache.get('key1')).toBe('value1');
    expect(await cache.get('key2')).toBeNull();
  });

  it('deletes entries', async () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(await cache.get('key1')).toBeNull();
  });

  it('checks existence with has', async () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('tracks statistics', async () => {
    cache.set('key1', 'value1');
    await cache.get('key1');
    await cache.get('nonexistent');

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  it('resets statistics', async () => {
    cache.set('key1', 'value1');
    await cache.get('key1');
    
    cache.resetStats();
    
    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it('clears all entries', async () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    
    expect(await cache.get('key1')).toBeNull();
    expect(await cache.get('key2')).toBeNull();
    expect(cache.getStats().size).toBe(0);
  });
});

describe('LRUCache hashing', () => {
  it('hashes string content', () => {
    const hash1 = LRUCache.hashContent('test content');
    const hash2 = LRUCache.hashContent('test content');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different content', () => {
    const hash1 = LRUCache.hashContent('content 1');
    const hash2 = LRUCache.hashContent('content 2');
    expect(hash1).not.toBe(hash2);
  });

  it('hashes buffer content', () => {
    const buffer = Buffer.from('test content');
    const hash = LRUCache.hashContent(buffer);
    expect(hash).toHaveLength(64);
  });

  it('hashes object content', () => {
    const obj = { key: 'value' };
    const hash = LRUCache.hashContent(obj);
    expect(hash).toHaveLength(64);
  });

  it('creates keys from parts', () => {
    const key = LRUCache.createKey('analyze', 'doc123', 'project456');
    expect(key).toHaveLength(64);
  });

  it('creates different keys for different parts', () => {
    const key1 = LRUCache.createKey('analyze', 'doc1');
    const key2 = LRUCache.createKey('analyze', 'doc2');
    expect(key1).not.toBe(key2);
  });

  it('handles null and undefined in key parts', () => {
    const key1 = LRUCache.createKey('test', null);
    const key2 = LRUCache.createKey('test', undefined);
    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
  });
});

describe('AnalysisCache', () => {
  let analysisCache: AnalysisCache;

  beforeEach(() => {
    AnalysisCache.resetInstance();
    analysisCache = AnalysisCache.getInstance();
  });

  afterEach(() => {
    AnalysisCache.resetInstance();
  });

  it('is a singleton', () => {
    const instance1 = AnalysisCache.getInstance();
    const instance2 = AnalysisCache.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('creates analysis keys', () => {
    const key = analysisCache.createAnalysisKey('analyze', 'contentHash123');
    expect(key).toHaveLength(64);
  });

  it('caches and retrieves analysis results', async () => {
    const key = 'test-key';
    const result = { summary: 'Test summary', evidenceType: 'Contract' };
    
    analysisCache.cacheAnalysis(key, result);
    const cached = await analysisCache.getCachedAnalysis<typeof result>(key);
    
    expect(cached).toEqual(result);
  });

  it('returns null for missing cache entries', async () => {
    const cached = await analysisCache.getCachedAnalysis('nonexistent');
    expect(cached).toBeNull();
  });

  it('invalidates cache entries', async () => {
    const key = 'test-key';
    analysisCache.cacheAnalysis(key, 'value');
    
    const invalidated = analysisCache.invalidate(key);
    
    expect(invalidated).toBe(true);
    expect(await analysisCache.getCachedAnalysis(key)).toBeNull();
  });

  it('tracks cache statistics', async () => {
    analysisCache.cacheAnalysis('key1', 'value1');
    await analysisCache.getCachedAnalysis('key1');
    await analysisCache.getCachedAnalysis('nonexistent');

    const stats = analysisCache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('clears all entries', async () => {
    analysisCache.cacheAnalysis('key1', 'value1');
    analysisCache.cacheAnalysis('key2', 'value2');
    
    analysisCache.clear();
    
    expect(await analysisCache.getCachedAnalysis('key1')).toBeNull();
    expect(await analysisCache.getCachedAnalysis('key2')).toBeNull();
  });
});
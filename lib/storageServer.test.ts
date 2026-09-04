import { describe, expect, it } from 'vitest';
import { getStorageConfig } from './storageServer';

describe('getStorageConfig', () => {
  it('returns the fixed Supabase storage bucket without reading cloud credentials', () => {
    expect(getStorageConfig()).toEqual({ bucket: 'discovery-files' });
  });
});

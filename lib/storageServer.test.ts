import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getStorageConfig } from './storageServer';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('getStorageConfig', () => {
  it('returns a complete config including optional endpoint and path style', () => {
    process.env.CLOUD_STORAGE_BUCKET = 'bucket';
    process.env.CLOUD_STORAGE_REGION = 'us-east1';
    process.env.CLOUD_STORAGE_ACCESS_KEY = 'access';
    process.env.CLOUD_STORAGE_SECRET_KEY = 'secret';
    process.env.CLOUD_STORAGE_ENDPOINT = 'https://storage.googleapis.com';
    process.env.CLOUD_STORAGE_FORCE_PATH_STYLE = 'true';

    const config = getStorageConfig();

    expect(config).toEqual({
      bucket: 'bucket',
      region: 'us-east1',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      endpoint: 'https://storage.googleapis.com',
      forcePathStyle: true,
    });
  });

  it('throws when any required value is missing', () => {
    process.env.CLOUD_STORAGE_BUCKET = '';
    process.env.CLOUD_STORAGE_REGION = 'us-east1';
    process.env.CLOUD_STORAGE_ACCESS_KEY = 'access';
    process.env.CLOUD_STORAGE_SECRET_KEY = 'secret';

    expect(() => getStorageConfig()).toThrow('Missing cloud storage environment variables.');
  });
});

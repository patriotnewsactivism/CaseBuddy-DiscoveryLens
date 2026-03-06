import { describe, expect, it } from 'vitest';

import { getSupabaseServerEnvStatusMessage, validateSupabaseServerEnv } from './supabaseEnv';

describe('validateSupabaseServerEnv', () => {
  it('returns valid when required variables are present', () => {
    const result = validateSupabaseServerEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key'
    });

    expect(result).toEqual({
      isValid: true,
      missing: []
    });
  });

  it('returns missing keys when required variables are absent', () => {
    const result = validateSupabaseServerEnv({});

    expect(result).toEqual({
      isValid: false,
      missing: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    });
  });
});

describe('getSupabaseServerEnvStatusMessage', () => {
  it('returns success message when env vars are present', () => {
    const message = getSupabaseServerEnvStatusMessage({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key'
    });

    expect(message).toBe('Supabase env vars present');
  });

  it('returns missing message that matches env-check output', () => {
    const message = getSupabaseServerEnvStatusMessage({
      NEXT_PUBLIC_SUPABASE_URL: ''
    });

    expect(message).toBe('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  });
});

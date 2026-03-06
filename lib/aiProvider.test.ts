import { describe, expect, it } from 'vitest';

import { getConfiguredAIProvider } from './aiProvider';

describe('getConfiguredAIProvider', () => {
  it('defaults to openai when OPENAI_API_KEY is set', () => {
    expect(getConfiguredAIProvider({ OPENAI_API_KEY: 'sk-test' })).toBe('openai');
  });

  it('uses gemini when only GEMINI_API_KEY is set', () => {
    expect(getConfiguredAIProvider({ GEMINI_API_KEY: 'gm-test' })).toBe('gemini');
  });

  it('respects AI_PROVIDER=openai when key exists', () => {
    expect(
      getConfiguredAIProvider({
        AI_PROVIDER: 'openai',
        OPENAI_API_KEY: 'sk-test',
        GEMINI_API_KEY: 'gm-test',
      })
    ).toBe('openai');
  });

  it('respects AI_PROVIDER=gemini when key exists', () => {
    expect(
      getConfiguredAIProvider({
        AI_PROVIDER: 'gemini',
        OPENAI_API_KEY: 'sk-test',
        GEMINI_API_KEY: 'gm-test',
      })
    ).toBe('gemini');
  });

  it('throws when no keys are configured', () => {
    expect(() => getConfiguredAIProvider({})).toThrow(
      'No AI provider API key configured. Set OPENAI_API_KEY or GEMINI_API_KEY.'
    );
  });

  it('throws when provider is openai but key is missing', () => {
    expect(() => getConfiguredAIProvider({ AI_PROVIDER: 'openai', GEMINI_API_KEY: 'gm-test' })).toThrow(
      'AI_PROVIDER is set to openai but OPENAI_API_KEY is missing.'
    );
  });

  it('throws when provider is gemini but key is missing', () => {
    expect(() => getConfiguredAIProvider({ AI_PROVIDER: 'gemini', OPENAI_API_KEY: 'sk-test' })).toThrow(
      'AI_PROVIDER is set to gemini but GEMINI_API_KEY is missing.'
    );
  });
});

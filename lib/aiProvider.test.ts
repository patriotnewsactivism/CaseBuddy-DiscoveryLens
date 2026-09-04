import { describe, expect, it } from 'vitest';

import { getConfiguredAIProvider } from './aiProvider';

describe('getConfiguredAIProvider', () => {
  it('defaults to openai when OPENAI_API_KEY is set', () => {
    expect(getConfiguredAIProvider({ OPENAI_API_KEY: 'sk-test' })).toBe('openai');
  });

  it('uses gemini when only GEMINI_API_KEY is set', () => {
    expect(getConfiguredAIProvider({ GEMINI_API_KEY: 'gm-test' })).toBe('gemini');
  });

  it('uses cohere when COHERE_API_KEY is set', () => {
    expect(getConfiguredAIProvider({ COHERE_API_KEY: 'co-test' })).toBe('cohere');
  });

  it('prefers Mistral, then Cohere, before paid OpenAI', () => {
    expect(
      getConfiguredAIProvider({
        MISTRAL_API_KEY: 'mi-test',
        COHERE_API_KEY: 'co-test',
        OPENAI_API_KEY: 'sk-test',
      })
    ).toBe('mistral');
    expect(
      getConfiguredAIProvider({
        COHERE_API_KEY: 'co-test',
        GEMINI_API_KEY: 'gm-test',
        OPENAI_API_KEY: 'sk-test',
      })
    ).toBe('cohere');
    expect(
      getConfiguredAIProvider({
        GEMINI_API_KEY: 'gm-test',
        OPENAI_API_KEY: 'sk-test',
      })
    ).toBe('openai');
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

  it('respects AI_PROVIDER=cohere when key exists', () => {
    expect(
      getConfiguredAIProvider({
        AI_PROVIDER: 'cohere',
        COHERE_API_KEY: 'co-test',
        GEMINI_API_KEY: 'gm-test',
      })
    ).toBe('cohere');
  });

  it('throws when no keys are configured', () => {
    expect(() => getConfiguredAIProvider({})).toThrow(
      'No AI provider API key configured. Set MISTRAL_API_KEY, COHERE_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.'
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

  it('throws when provider is cohere but key is missing', () => {
    expect(() => getConfiguredAIProvider({ AI_PROVIDER: 'cohere', OPENAI_API_KEY: 'sk-test' })).toThrow(
      'AI_PROVIDER is set to cohere but COHERE_API_KEY is missing.'
    );
  });
});

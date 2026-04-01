import { describe, expect, it } from 'vitest';

import { isAIAuthError, isAIProviderConfigError } from './aiError';

describe('aiError helpers', () => {
  describe('isAIProviderConfigError', () => {
    it('detects explicit AI provider configuration failures', () => {
      expect(isAIProviderConfigError(new Error('AI_PROVIDER is set to openai but OPENAI_API_KEY is missing.'))).toBe(true);
      expect(isAIProviderConfigError(new Error('No AI provider API key configured. Set OPENAI_API_KEY.'))).toBe(true);
      expect(isAIProviderConfigError(new Error('AI_PROVIDER is set to azure but Azure OpenAI configuration is incomplete.'))).toBe(true);
    });

    it('does not classify authentication failures as configuration errors', () => {
      expect(isAIProviderConfigError(new Error('Invalid API key provided'))).toBe(false);
    });
  });

  describe('isAIAuthError', () => {
    it('detects status-based authentication failures', () => {
      expect(isAIAuthError({ status: 401 })).toBe(true);
      expect(isAIAuthError({ status: 403 })).toBe(true);
      expect(isAIAuthError({ code: 'AuthenticationError' })).toBe(true);
    });

    it('detects message-based authentication failures', () => {
      expect(isAIAuthError(new Error('Invalid API key provided'))).toBe(true);
      expect(isAIAuthError(new Error('Access denied to requested resource'))).toBe(true);
      expect(isAIAuthError(new Error('Unauthorized request'))).toBe(true);
      expect(isAIAuthError(new Error('API key not valid. Please pass a valid API key.'))).toBe(true);
    });

    it('does not classify non-auth failures', () => {
      expect(isAIAuthError(new Error('Rate limit exceeded'))).toBe(false);
    });
  });
});

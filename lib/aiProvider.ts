export type AIProvider = 'openai' | 'azure' | 'gemini';

interface EnvConfig {
  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_OPENAI_KEY?: string;
  AZURE_OPENAI_API_KEY?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;
  AZURE_OPENAI_DEPLOYMENT_ANALYSIS?: string;
  AZURE_OPENAI_DEPLOYMENT_CHAT?: string;
  [key: string]: string | undefined;
}

const normalizeProvider = (value?: string): AIProvider | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'openai') return 'openai';
  if (normalized === 'gemini') return 'gemini';
  if (normalized === 'azure' || normalized === 'azure-openai') return 'azure';
  return null;
};

const isAzureConfigured = (env: EnvConfig): boolean => {
  const endpoint = env.AZURE_OPENAI_ENDPOINT?.trim();
  const key = (env.AZURE_OPENAI_KEY || env.AZURE_OPENAI_API_KEY)?.trim();
  const deployment = (
    env.AZURE_OPENAI_DEPLOYMENT ||
    env.AZURE_OPENAI_DEPLOYMENT_ANALYSIS ||
    env.AZURE_OPENAI_DEPLOYMENT_CHAT
  )?.trim();
  return Boolean(endpoint && key && deployment);
};

export function getConfiguredAIProvider(env: EnvConfig = process.env): AIProvider {
  const preferred = normalizeProvider(env.AI_PROVIDER);

  if (preferred) {
    if (preferred === 'openai') {
      if (!env.OPENAI_API_KEY?.trim())
        throw new Error('AI_PROVIDER is set to openai but OPENAI_API_KEY is missing.');
      return 'openai';
    }
    if (preferred === 'gemini') {
      if (!env.GEMINI_API_KEY?.trim())
        throw new Error('AI_PROVIDER is set to gemini but GEMINI_API_KEY is missing.');
      return 'gemini';
    }
    if (preferred === 'azure') {
      if (!isAzureConfigured(env))
        throw new Error('AI_PROVIDER is set to azure but Azure OpenAI configuration is incomplete.');
      return 'azure';
    }
  }

  // Auto-detect: Azure > OpenAI > Gemini
  if (isAzureConfigured(env)) return 'azure';
  if (env.OPENAI_API_KEY?.trim()) return 'openai';
  if (env.GEMINI_API_KEY?.trim()) return 'gemini';

  throw new Error(
    'No AI provider API key configured. Set OPENAI_API_KEY, GEMINI_API_KEY, or Azure OpenAI credentials.'
  );
}

/**
 * Returns all configured providers in priority order (Azure > OpenAI > Gemini).
 * When AI_PROVIDER is explicitly set, only that provider is returned (no fallback).
 * Used by routes to implement automatic fallback when a provider's credentials fail.
 */
export function getConfiguredAIProviders(env: EnvConfig = process.env): AIProvider[] {
  const preferred = normalizeProvider(env.AI_PROVIDER);

  // If explicitly set, only use that provider — no fallback
  if (preferred) {
    return [getConfiguredAIProvider(env)];
  }

  const providers: AIProvider[] = [];
  if (isAzureConfigured(env)) providers.push('azure');
  if (env.OPENAI_API_KEY?.trim()) providers.push('openai');
  if (env.GEMINI_API_KEY?.trim()) providers.push('gemini');

  if (providers.length === 0) {
    throw new Error(
      'No AI provider API key configured. Set OPENAI_API_KEY, GEMINI_API_KEY, or Azure OpenAI credentials.'
    );
  }

  return providers;
}

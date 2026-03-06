export type AIProvider = 'openai' | 'gemini';

interface EnvConfig {
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  AI_PROVIDER?: string;
}

const normalizeProvider = (value?: string): AIProvider | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'openai' || normalized === 'gemini') {
    return normalized;
  }

  return null;
};

export function getConfiguredAIProvider(env: EnvConfig = process.env): AIProvider {
  const preferredProvider = normalizeProvider(env.AI_PROVIDER);

  if (preferredProvider === 'openai') {
    if (!env.OPENAI_API_KEY) {
      throw new Error('AI_PROVIDER is set to openai but OPENAI_API_KEY is missing.');
    }
    return 'openai';
  }

  if (preferredProvider === 'gemini') {
    if (!env.GEMINI_API_KEY) {
      throw new Error('AI_PROVIDER is set to gemini but GEMINI_API_KEY is missing.');
    }
    return 'gemini';
  }

  if (env.OPENAI_API_KEY) {
    return 'openai';
  }

  if (env.GEMINI_API_KEY) {
    return 'gemini';
  }

  throw new Error('No AI provider API key configured. Set OPENAI_API_KEY or GEMINI_API_KEY.');
}

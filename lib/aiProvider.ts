export type AIProvider = 'openai' | 'gemini' | 'cohere';

interface EnvConfig {
  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  COHERE_API_KEY?: string;
  [key: string]: string | undefined;
}

const normalizeProvider = (value?: string): AIProvider | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'openai') return 'openai';
  if (normalized === 'gemini') return 'gemini';
  if (normalized === 'cohere') return 'cohere';
  return null;
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
    if (preferred === 'cohere') {
      if (!env.COHERE_API_KEY?.trim())
        throw new Error('AI_PROVIDER is set to cohere but COHERE_API_KEY is missing.');
      return 'cohere';
    }
  }

  // Auto-detect, free tiers first:
  // Cohere (free tier, 256K context for discovery docs) > Gemini (free tier) > OpenAI (paid)
  if (env.COHERE_API_KEY?.trim()) return 'cohere';
  if (env.GEMINI_API_KEY?.trim()) return 'gemini';
  if (env.OPENAI_API_KEY?.trim()) return 'openai';

  throw new Error(
    'No AI provider API key configured. Set COHERE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.'
  );
}

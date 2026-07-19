export type AIProvider = 'mistral' | 'openai' | 'gemini' | 'cohere';

interface EnvConfig {
  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  COHERE_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  [key: string]: string | undefined;
}

const normalizeProvider = (value?: string): AIProvider | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'openai') return 'openai';
  if (normalized === 'gemini') return 'gemini';
  if (normalized === 'cohere') return 'cohere';
  if (normalized === 'mistral') return 'mistral';
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
    if (preferred === 'mistral') {
      if (!env.MISTRAL_API_KEY?.trim())
        throw new Error('AI_PROVIDER is set to mistral but MISTRAL_API_KEY is missing.');
      return 'mistral';
    }
  }

  // Auto-detect, free tiers first. Mistral is preferred (fast, reliable
  // Codestral/Large free-tier access, no per-user model deprecation surprises
  // like Gemini has had). Gemini is intentionally NOT auto-selected anymore —
  // only used if explicitly set via AI_PROVIDER=gemini.
  if (env.MISTRAL_API_KEY?.trim()) return 'mistral';
  if (env.COHERE_API_KEY?.trim()) return 'cohere';
  if (env.OPENAI_API_KEY?.trim()) return 'openai';
  if (env.GEMINI_API_KEY?.trim()) return 'gemini';

  throw new Error(
    'No AI provider API key configured. Set MISTRAL_API_KEY, COHERE_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.'
  );
}

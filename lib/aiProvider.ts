export type AIProvider = 'azure' | 'openai' | 'gemini';

interface EnvConfig {
  AI_PROVIDER?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_OPENAI_KEY?: string;
  AZURE_OPENAI_API_KEY?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;
  AZURE_OPENAI_DEPLOYMENT_ANALYSIS?: string;
  AZURE_OPENAI_DEPLOYMENT_CHAT?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  [key: string]: string | undefined;
}

const normalizeProvider = (value?: string): AIProvider | null => {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'azure' || v === 'azure-openai') return 'azure';
  if (v === 'openai') return 'openai';
  if (v === 'gemini') return 'gemini';
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

  // If AI_PROVIDER is explicitly set, validate and return it.
  if (preferred === 'openai') {
    if (!env.OPENAI_API_KEY?.trim()) {
      throw new Error('AI_PROVIDER is set to openai but OPENAI_API_KEY is missing.');
    }
    return 'openai';
  }
  if (preferred === 'gemini') {
    if (!env.GEMINI_API_KEY?.trim()) {
      throw new Error('AI_PROVIDER is set to gemini but GEMINI_API_KEY is missing.');
    }
    return 'gemini';
  }
  if (preferred === 'azure') {
    if (!isAzureConfigured(env)) {
      throw new Error('AI_PROVIDER is set to azure but Azure OpenAI configuration is incomplete.');
    }
    return 'azure';
  }

  // Auto-detect: prefer Azure, then OpenAI, then Gemini.
  if (isAzureConfigured(env)) return 'azure';
  if (env.OPENAI_API_KEY?.trim()) return 'openai';
  if (env.GEMINI_API_KEY?.trim()) return 'gemini';

  throw new Error(
    'No AI provider API key configured. Set OPENAI_API_KEY, GEMINI_API_KEY, or Azure OpenAI credentials.'
  );
}

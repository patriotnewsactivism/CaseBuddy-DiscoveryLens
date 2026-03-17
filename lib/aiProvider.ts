export type AIProvider = 'azure';

interface EnvConfig {
  AI_PROVIDER?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_OPENAI_KEY?: string;
  AZURE_OPENAI_API_KEY?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;
  AZURE_OPENAI_DEPLOYMENT_ANALYSIS?: string;
  AZURE_OPENAI_DEPLOYMENT_CHAT?: string;
  [key: string]: string | undefined;
}

const normalizeProvider = (value?: string): AIProvider | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'azure' || normalized === 'azure-openai') {
    return 'azure';
  }

  return null;
};

const isAzureConfigured = (env: EnvConfig = process.env): boolean => {
  const endpoint = env.AZURE_OPENAI_ENDPOINT?.trim();
  const key = (env.AZURE_OPENAI_KEY || env.AZURE_OPENAI_API_KEY)?.trim();
  const deployment =
    (env.AZURE_OPENAI_DEPLOYMENT ||
    env.AZURE_OPENAI_DEPLOYMENT_ANALYSIS ||
    env.AZURE_OPENAI_DEPLOYMENT_CHAT)?.trim();
  return Boolean(endpoint && key && deployment);
};

export function getConfiguredAIProvider(env: EnvConfig = process.env): AIProvider {
  const preferredProvider = normalizeProvider(env.AI_PROVIDER);

  // For this project, we ONLY support Azure OpenAI.
  // We ignore preferredProvider if it's not azure and check if azure is configured.
  
  if (!isAzureConfigured(env)) {
    throw new Error('Azure OpenAI configuration is incomplete. Ensure AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, and DEPLOYMENT are set.');
  }
  
  return 'azure';
}

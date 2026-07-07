const AUTH_ERROR_PATTERNS = [
  '401',
  '403',
  'authentication',
  'unauthorized',
  'forbidden',
  'access denied',
  'invalid subscription key',
  'invalid api key',
  'api key not valid',
  'incorrect api key',
  'authenticationerror',
] as const;

const CONFIG_ERROR_PATTERNS = [
  'ai_provider is set to',
  'no ai provider api key configured',
  'configuration is incomplete',
] as const;

interface ErrorWithMeta {
  status?: number;
  code?: string;
  message?: string;
}

const normalizeErrorText = (error: unknown): string => {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'string') return error.toLowerCase();
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as ErrorWithMeta).message;
    if (typeof message === 'string') return message.toLowerCase();
  }
  return '';
};

export const isAIProviderConfigError = (error: unknown): boolean => {
  const message = normalizeErrorText(error);
  return CONFIG_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

export const isAIAuthError = (error: unknown): boolean => {
  if (typeof error === 'object' && error !== null) {
    const meta = error as ErrorWithMeta;
    if (meta.status === 401 || meta.status === 403) return true;
    if (meta.code === 'AuthenticationError') return true;
  }

  const message = normalizeErrorText(error);
  return AUTH_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

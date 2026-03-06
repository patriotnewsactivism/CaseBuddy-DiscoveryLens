const REQUIRED_SUPABASE_SERVER_ENV_VARS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

export type RequiredSupabaseServerEnvVar = (typeof REQUIRED_SUPABASE_SERVER_ENV_VARS)[number];

export interface SupabaseServerEnvValidationResult {
  isValid: boolean;
  missing: RequiredSupabaseServerEnvVar[];
}

export function validateSupabaseServerEnv(
  env: NodeJS.ProcessEnv
): SupabaseServerEnvValidationResult {
  const missing = REQUIRED_SUPABASE_SERVER_ENV_VARS.filter((name) => !env[name]);

  return {
    isValid: missing.length === 0,
    missing
  };
}

export function getSupabaseServerEnvStatusMessage(env: NodeJS.ProcessEnv): string {
  const { isValid, missing } = validateSupabaseServerEnv(env);

  if (isValid) {
    return 'Supabase env vars present';
  }

  return `Missing ${missing.join(' or ')}`;
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// NOTE: Database (from ./database.types) is intentionally NOT used as the
// SupabaseClient generic here. The generated schema is large enough (many
// tables + big Postgres enum unions) that recent TypeScript versions collapse
// query-builder result types to `never` across the codebase (documents,
// projects, etc. all hit this). Using an untyped client avoids that systemic
// build failure; runtime behavior is 100% unchanged, this only affects
// compile-time inference/autocomplete. See CaseBuddy-DiscoveryLens 2026-07-19 fix.
import { validateSupabaseServerEnv } from './supabaseEnv';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const validation = validateSupabaseServerEnv({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    if (!validation.isValid) {
      throw new Error(`Missing required Supabase server environment variables: ${validation.missing.join(', ')}`);
    }

    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  return supabaseAdmin;
}

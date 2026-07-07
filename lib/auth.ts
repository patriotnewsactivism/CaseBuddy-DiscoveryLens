import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — persists session in localStorage (same project as case-companion)
export const supabaseBrowser = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'casebuddy-auth', // shared storage key so login works across both apps
  },
});

export async function signIn(email: string, password: string) {
  return supabaseBrowser.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, fullName?: string) {
  return supabaseBrowser.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
}

export async function signOut() {
  return supabaseBrowser.auth.signOut();
}

export async function getSession() {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session;
}

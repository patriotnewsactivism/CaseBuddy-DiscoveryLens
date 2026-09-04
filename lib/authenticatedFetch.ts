'use client';

import { supabaseBrowser } from '@/lib/auth';

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { data, error } = await supabaseBrowser.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('You must be signed in to perform this action.');
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${data.session.access_token}`);

  return fetch(input, { ...init, headers });
}

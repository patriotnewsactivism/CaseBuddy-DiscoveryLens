import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as listProjects } from '../app/api/projects/route';
import { POST as createDocument } from '../app/api/documents/route';

describe('API authorization boundary', () => {
  it('rejects unauthenticated project listing before accessing Supabase', async () => {
    const response = await listProjects(new NextRequest('http://localhost/api/projects'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('rejects unauthenticated document creation before processing the payload', async () => {
    const response = await createDocument(new NextRequest('http://localhost/api/documents', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'UNAUTHENTICATED' });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseAdmin: () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

import { requireAuthenticatedUser, requireProjectRole } from './serverAuth';

const requestWithToken = () => new NextRequest('http://localhost/api/projects/project-1', {
  headers: { Authorization: 'Bearer access-token' },
});

const queryReturning = (result: unknown) => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(result);
  return query;
};

describe('requireAuthenticatedUser', () => {
  it('rejects requests without a bearer token', async () => {
    const result = await requireAuthenticatedUser(new NextRequest('http://localhost/api/projects'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({ error: 'UNAUTHENTICATED' });
    }
  });

  it('rejects invalid access tokens', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid token') });

    const result = await requireAuthenticatedUser(requestWithToken());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });
});

describe('requireProjectRole', () => {
  it('allows an owner to perform owner-only operations', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'owner-id' } }, error: null });
    mocks.from.mockReturnValueOnce(queryReturning({ data: { owner_id: 'owner-id' }, error: null }));

    const result = await requireProjectRole(requestWithToken(), 'project-1', ['owner']);

    expect(result).toEqual({ ok: true, value: { user: { id: 'owner-id' }, role: 'owner' } });
  });

  it('allows a viewer to read but not edit', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'viewer-id' } }, error: null });
    mocks.from
      .mockReturnValueOnce(queryReturning({ data: { owner_id: 'owner-id' }, error: null }))
      .mockReturnValueOnce(queryReturning({ data: { role: 'viewer' }, error: null }));

    const result = await requireProjectRole(requestWithToken(), 'project-1', ['paralegal']);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it('rejects users outside the project', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'outsider-id' } }, error: null });
    mocks.from
      .mockReturnValueOnce(queryReturning({ data: { owner_id: 'owner-id' }, error: null }))
      .mockReturnValueOnce(queryReturning({ data: null, error: null }));

    const result = await requireProjectRole(requestWithToken(), 'project-1', ['viewer']);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });
});

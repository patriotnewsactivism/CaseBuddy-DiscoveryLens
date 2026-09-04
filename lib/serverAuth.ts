import type { User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export type ProjectRole = 'owner' | 'attorney' | 'paralegal' | 'viewer';

export interface AuthenticatedRequest {
  user: User;
}

export interface AuthorizedProjectRequest extends AuthenticatedRequest {
  role: ProjectRole;
}

type AuthorizationResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: NextResponse };

const authorizationError = (error: 'UNAUTHENTICATED' | 'FORBIDDEN'): NextResponse =>
  NextResponse.json({ error }, { status: error === 'UNAUTHENTICATED' ? 401 : 403 });

const roleRank: Record<ProjectRole, number> = {
  viewer: 0,
  paralegal: 1,
  attorney: 2,
  owner: 3,
};

const hasRequiredRole = (role: ProjectRole, allowedRoles: readonly ProjectRole[]): boolean =>
  allowedRoles.some((allowedRole) => roleRank[role] >= roleRank[allowedRole]);

export async function requireAuthenticatedUser(
  request: NextRequest,
): Promise<AuthorizationResult<AuthenticatedRequest>> {
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    return { ok: false, response: authorizationError('UNAUTHENTICATED') };
  }

  const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);
  if (error || !data.user) {
    return { ok: false, response: authorizationError('UNAUTHENTICATED') };
  }

  return { ok: true, value: { user: data.user } };
}

export async function requireProjectRole(
  request: NextRequest,
  projectId: string,
  allowedRoles: readonly ProjectRole[],
): Promise<AuthorizationResult<AuthorizedProjectRequest>> {
  const authentication = await requireAuthenticatedUser(request);
  if (!authentication.ok) return authentication;

  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError || !project) {
    return { ok: false, response: authorizationError('FORBIDDEN') };
  }

  let role: ProjectRole | null = project.owner_id === authentication.value.user.id ? 'owner' : null;
  if (!role) {
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', authentication.value.user.id)
      .maybeSingle();

    if (membershipError || !membership || !isProjectRole(membership.role)) {
      return { ok: false, response: authorizationError('FORBIDDEN') };
    }

    role = membership.role;
  }

  if (!hasRequiredRole(role, allowedRoles)) {
    return { ok: false, response: authorizationError('FORBIDDEN') };
  }

  return { ok: true, value: { ...authentication.value, role } };
}

export async function requireDocumentRole(
  request: NextRequest,
  documentId: string,
  allowedRoles: readonly ProjectRole[],
): Promise<AuthorizationResult<AuthorizedProjectRequest>> {
  const supabase = getSupabaseAdmin();
  const { data: document, error } = await supabase
    .from('documents')
    .select('project_id')
    .eq('id', documentId)
    .maybeSingle();

  if (error || !document?.project_id) {
    return { ok: false, response: authorizationError('FORBIDDEN') };
  }

  return requireProjectRole(request, document.project_id, allowedRoles);
}

function isProjectRole(value: string): value is ProjectRole {
  return value === 'owner' || value === 'attorney' || value === 'paralegal' || value === 'viewer';
}

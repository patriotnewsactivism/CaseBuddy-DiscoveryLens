const DEFAULT_BATES_PREFIX = 'DEF';
const BATES_PREFIX_REGEX = /^[A-Z0-9]{2,10}$/;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 5000;

export type CreateProjectInput = {
  name: string;
  description: string | null;
  batesPrefix: string;
  caseId?: string | null;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
  batesCounter?: number;
  caseId?: string | null;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function sanitizeName(name: unknown): ValidationResult<string> {
  if (typeof name !== 'string') return { ok: false, error: 'Project name is required' };
  const normalized = name.trim();
  if (!normalized) return { ok: false, error: 'Project name is required' };
  if (normalized.length > MAX_NAME_LENGTH) return { ok: false, error: `Project name must be ${MAX_NAME_LENGTH} characters or less` };
  return { ok: true, value: normalized };
}

function sanitizeDescription(description: unknown): ValidationResult<string | null> {
  if (description === undefined || description === null) return { ok: true, value: null };
  if (typeof description !== 'string') return { ok: false, error: 'Project description must be a string' };
  const normalized = description.trim();
  if (!normalized) return { ok: true, value: null };
  if (normalized.length > MAX_DESCRIPTION_LENGTH) return { ok: false, error: `Project description must be ${MAX_DESCRIPTION_LENGTH} characters or less` };
  return { ok: true, value: normalized };
}

function sanitizeBatesPrefix(input: unknown): ValidationResult<string> {
  if (input === undefined || input === null || input === '') return { ok: true, value: DEFAULT_BATES_PREFIX };
  if (typeof input !== 'string') return { ok: false, error: 'Bates prefix must be a string' };
  const normalized = input.trim().toUpperCase();
  if (!BATES_PREFIX_REGEX.test(normalized)) return { ok: false, error: 'Bates prefix must be 2-10 uppercase letters/numbers' };
  return { ok: true, value: normalized };
}

function sanitizeBatesCounter(input: unknown): ValidationResult<number> {
  if (typeof input !== 'number' || !Number.isInteger(input) || input < 1) return { ok: false, error: 'Bates counter must be a positive integer' };
  return { ok: true, value: input };
}

export function validateUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function validateCreateProjectInput(body: unknown): ValidationResult<CreateProjectInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request body' };
  const payload = body as { name?: unknown; description?: unknown; batesPrefix?: unknown; caseId?: unknown };

  const nameResult = sanitizeName(payload.name);
  if (!nameResult.ok) return nameResult;

  const descriptionResult = sanitizeDescription(payload.description);
  if (!descriptionResult.ok) return descriptionResult;

  const prefixResult = sanitizeBatesPrefix(payload.batesPrefix);
  if (!prefixResult.ok) return prefixResult;

  // Optional case_id - must be valid UUID or null
  let caseId: string | null = null;
  if (payload.caseId && typeof payload.caseId === 'string') {
    if (!validateUuid(payload.caseId)) return { ok: false, error: 'caseId must be a valid UUID' };
    caseId = payload.caseId;
  }

  return { ok: true, value: { name: nameResult.value, description: descriptionResult.value, batesPrefix: prefixResult.value, caseId } };
}

export function validateProjectPatchInput(body: unknown): ValidationResult<UpdateProjectInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request body' };
  const payload = body as { name?: unknown; description?: unknown; batesCounter?: unknown; caseId?: unknown };
  const updates: UpdateProjectInput = {};

  if (payload.name !== undefined) {
    const r = sanitizeName(payload.name);
    if (!r.ok) return r;
    updates.name = r.value;
  }
  if (payload.description !== undefined) {
    const r = sanitizeDescription(payload.description);
    if (!r.ok) return r;
    updates.description = r.value;
  }
  if (payload.batesCounter !== undefined) {
    const r = sanitizeBatesCounter(payload.batesCounter);
    if (!r.ok) return r;
    updates.batesCounter = r.value;
  }
  if (payload.caseId !== undefined) {
    if (payload.caseId !== null && typeof payload.caseId === 'string' && !validateUuid(payload.caseId)) {
      return { ok: false, error: 'caseId must be a valid UUID' };
    }
    updates.caseId = (payload.caseId as string | null);
  }

  if (Object.keys(updates).length === 0) return { ok: false, error: 'No valid fields provided for update' };
  return { ok: true, value: updates };
}

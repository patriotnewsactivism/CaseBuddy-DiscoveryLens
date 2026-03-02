const DEFAULT_BATES_PREFIX = 'DEF';
const BATES_PREFIX_REGEX = /^[A-Z0-9]{2,10}$/;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 5000;

export type CreateProjectInput = {
  name: string;
  description: string | null;
  batesPrefix: string;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
  batesCounter?: number;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function sanitizeName(name: unknown): ValidationResult<string> {
  if (typeof name !== 'string') {
    return { ok: false, error: 'Project name is required' };
  }

  const normalized = name.trim();
  if (!normalized) {
    return { ok: false, error: 'Project name is required' };
  }

  if (normalized.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `Project name must be ${MAX_NAME_LENGTH} characters or less`,
    };
  }

  return { ok: true, value: normalized };
}

function sanitizeDescription(description: unknown): ValidationResult<string | null> {
  if (description === undefined || description === null) {
    return { ok: true, value: null };
  }

  if (typeof description !== 'string') {
    return { ok: false, error: 'Project description must be a string' };
  }

  const normalized = description.trim();
  if (!normalized) {
    return { ok: true, value: null };
  }

  if (normalized.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Project description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
    };
  }

  return { ok: true, value: normalized };
}

function sanitizeBatesPrefix(input: unknown): ValidationResult<string> {
  if (input === undefined || input === null || input === '') {
    return { ok: true, value: DEFAULT_BATES_PREFIX };
  }

  if (typeof input !== 'string') {
    return { ok: false, error: 'Bates prefix must be a string' };
  }

  const normalized = input.trim().toUpperCase();
  if (!BATES_PREFIX_REGEX.test(normalized)) {
    return {
      ok: false,
      error: 'Bates prefix must be 2-10 uppercase letters/numbers',
    };
  }

  return { ok: true, value: normalized };
}

function sanitizeBatesCounter(input: unknown): ValidationResult<number> {
  if (typeof input !== 'number' || !Number.isInteger(input) || input < 1) {
    return { ok: false, error: 'Bates counter must be a positive integer' };
  }

  return { ok: true, value: input };
}

export function validateCreateProjectInput(body: unknown): ValidationResult<CreateProjectInput> {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }

  const payload = body as {
    name?: unknown;
    description?: unknown;
    batesPrefix?: unknown;
  };

  const nameResult = sanitizeName(payload.name);
  if (!nameResult.ok) return nameResult;

  const descriptionResult = sanitizeDescription(payload.description);
  if (!descriptionResult.ok) return descriptionResult;

  const prefixResult = sanitizeBatesPrefix(payload.batesPrefix);
  if (!prefixResult.ok) return prefixResult;

  return {
    ok: true,
    value: {
      name: nameResult.value,
      description: descriptionResult.value,
      batesPrefix: prefixResult.value,
    },
  };
}

export function validateProjectPatchInput(body: unknown): ValidationResult<UpdateProjectInput> {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body' };
  }

  const payload = body as {
    name?: unknown;
    description?: unknown;
    batesCounter?: unknown;
  };

  const updates: UpdateProjectInput = {};

  if (payload.name !== undefined) {
    const nameResult = sanitizeName(payload.name);
    if (!nameResult.ok) return nameResult;
    updates.name = nameResult.value;
  }

  if (payload.description !== undefined) {
    const descriptionResult = sanitizeDescription(payload.description);
    if (!descriptionResult.ok) return descriptionResult;
    updates.description = descriptionResult.value;
  }

  if (payload.batesCounter !== undefined) {
    const counterResult = sanitizeBatesCounter(payload.batesCounter);
    if (!counterResult.ok) return counterResult;
    updates.batesCounter = counterResult.value;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: 'No valid fields provided for update' };
  }

  return { ok: true, value: updates };
}

export function validateUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

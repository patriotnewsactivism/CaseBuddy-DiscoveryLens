import { describe, expect, it } from 'vitest';
import {
  validateCreateProjectInput,
  validateProjectPatchInput,
  validateUuid,
} from '../lib/projectValidation';

describe('validateCreateProjectInput', () => {
  it('sanitizes and normalizes valid create payload', () => {
    const result = validateCreateProjectInput({
      name: '  Important Case  ',
      description: '  Notes here  ',
      batesPrefix: ' abc12 ',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Important Case',
        description: 'Notes here',
        batesPrefix: 'ABC12',
        caseId: null,
      },
    });
  });

  it('rejects invalid bates prefix', () => {
    const result = validateCreateProjectInput({
      name: 'Case',
      batesPrefix: 'ABC-12',
    });

    expect(result).toEqual({
      ok: false,
      error: 'Bates prefix must be 2-10 uppercase letters/numbers',
    });
  });
});

describe('validateProjectPatchInput', () => {
  it('rejects empty updates', () => {
    const result = validateProjectPatchInput({});

    expect(result).toEqual({
      ok: false,
      error: 'No valid fields provided for update',
    });
  });

  it('requires positive integer bates counter', () => {
    const result = validateProjectPatchInput({ batesCounter: 0 });

    expect(result).toEqual({
      ok: false,
      error: 'Bates counter must be a positive integer',
    });
  });
});

describe('validateUuid', () => {
  it('returns true for valid uuid and false otherwise', () => {
    expect(validateUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(validateUuid('not-a-uuid')).toBe(false);
  });
});

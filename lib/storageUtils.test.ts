/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';
import { buildObjectKey, normalizeProjectName } from './storageUtils';

describe('storage utils', () => {
  describe('normalizeProjectName', () => {
    it('creates a slugified project name', () => {
      expect(normalizeProjectName('  My Big Case  ')).toBe('my-big-case');
    });

    it('falls back to project when empty', () => {
      expect(normalizeProjectName('   ')).toBe('project');
    });

    it('dedupes separators', () => {
      expect(normalizeProjectName('Case---Name__X')).toBe('case-name-x');
    });
  });

  describe('buildObjectKey', () => {
    it('creates predictable object keys', () => {
      const key = buildObjectKey('Alpha', 'evidence.pdf', '123');
      expect(key).toBe('projects/alpha/assets/123-evidence.pdf');
    });

    it('sanitizes unsafe characters', () => {
      const key = buildObjectKey('Alpha Case', 'evi*<dence>.pdf', 'xyz');
      expect(key).toBe('projects/alpha-case/assets/xyz-evidence.pdf');
    });
  });
});

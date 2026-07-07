import type { CaseHighlight } from './types';

export type { CaseHighlight };

export interface InsightsFileContext {
  batesNumber: string;
  name: string;
  evidenceType: string;
  summary: string;
  relevantFacts: string[];
  sentiment?: string;
}

const VALID_CATEGORIES = new Set(['Admission', 'Contradiction', 'Key Fact', 'Credibility Issue', 'Smoking Gun']);
const VALID_SEVERITIES = new Set(['Critical', 'High', 'Medium']);

/**
 * Defensively validate/coerce whatever JSON the LLM returned into well-formed
 * CaseHighlight objects, dropping anything that doesn't have the minimum
 * required shape rather than letting malformed data reach the UI.
 */
export function sanitizeHighlights(raw: unknown): CaseHighlight[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { highlights?: unknown[] })?.highlights)
      ? (raw as { highlights: unknown[] }).highlights
      : [];

  const result: CaseHighlight[] = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;

    const headline = typeof obj.headline === 'string' ? obj.headline.trim() : '';
    if (!headline) continue;

    const category = VALID_CATEGORIES.has(obj.category as string) ? (obj.category as CaseHighlight['category']) : 'Key Fact';
    const severity = VALID_SEVERITIES.has(obj.severity as string) ? (obj.severity as CaseHighlight['severity']) : 'Medium';
    const explanation = typeof obj.explanation === 'string' ? obj.explanation : '';
    const batesReferences = Array.isArray(obj.batesReferences)
      ? obj.batesReferences.filter((b): b is string => typeof b === 'string')
      : [];

    result.push({ category, severity, headline, explanation, batesReferences });
  }

  const severityRank: Record<CaseHighlight['severity'], number> = { Critical: 0, High: 1, Medium: 2 };
  return result.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

export function buildInsightsPrompt(files: InsightsFileContext[], casePerspective?: string): string {
  const perspectiveText =
    casePerspective === 'defense_support'
      ? 'You are assisting defense counsel. Judge severity/category from the defense\'s perspective.'
      : casePerspective === 'plaintiff_support'
        ? 'You are assisting a plaintiff/litigator. Judge severity/category from the plaintiff\'s perspective.'
        : 'You are reviewing materials in your own matter. Judge severity/category relative to the user.';

  const fileBlocks = files
    .map(
      f =>
        `--- ${f.batesNumber} (${f.name}) ---\nType: ${f.evidenceType}\nSentiment: ${f.sentiment || 'Unknown'}\nSummary: ${f.summary}\nKey facts: ${f.relevantFacts.join('; ')}`
    )
    .join('\n\n');

  return [
    `CASE PERSPECTIVE: ${perspectiveText}`,
    `DISCOVERY FILES (${files.length} total):`,
    fileBlocks,
    'Respond with a JSON object: {"highlights": [{"category": ..., "severity": ..., "headline": ..., "explanation": ..., "batesReferences": [...]}]}',
  ].join('\n\n');
}

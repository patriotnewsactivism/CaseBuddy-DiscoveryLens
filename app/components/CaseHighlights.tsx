'use client';

import React from 'react';
import { CaseHighlight, CasePerspective, DiscoveryFile } from '@/lib/types';
import { generateCaseHighlights } from '@/lib/geminiService';
import BatesBadge from './BatesBadge';

interface CaseHighlightsProps {
  files: DiscoveryFile[];
  casePerspective: CasePerspective;
  onSelectFile: (id: string) => void;
}

const SEVERITY_STYLES: Record<CaseHighlight['severity'], string> = {
  Critical: 'bg-red-50 border-red-300 text-red-700',
  High: 'bg-amber-50 border-amber-300 text-amber-700',
  Medium: 'bg-slate-50 border-slate-300 text-slate-600',
};

const CATEGORY_ICONS: Record<CaseHighlight['category'], string> = {
  Admission: '⚖️',
  Contradiction: '⚡',
  'Smoking Gun': '🔥',
  'Credibility Issue': '❓',
  'Key Fact': '📌',
};

const MIN_ANALYZED_FILES = 2;

const CaseHighlights: React.FC<CaseHighlightsProps> = ({ files, casePerspective, onSelectFile }) => {
  const [highlights, setHighlights] = React.useState<CaseHighlight[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = React.useState(false);

  const analyzedFiles = React.useMemo(() => files.filter(f => f.analysis), [files]);

  const batesToFileId = React.useMemo(() => {
    const map = new Map<string, string>();
    files.forEach(f => map.set(f.batesNumber.formatted, f.id));
    return map;
  }, [files]);

  const runGeneration = React.useCallback(async () => {
    if (analyzedFiles.length < MIN_ANALYZED_FILES) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateCaseHighlights(files, casePerspective);
      setHighlights(result);
      setHasGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate case highlights.');
    } finally {
      setIsLoading(false);
    }
  }, [files, casePerspective, analyzedFiles.length]);

  // Auto-generate once, the first time enough documents have been analyzed.
  React.useEffect(() => {
    if (!hasGenerated && !isLoading && analyzedFiles.length >= MIN_ANALYZED_FILES) {
      runGeneration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzedFiles.length]);

  if (analyzedFiles.length < MIN_ANALYZED_FILES) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
        <span className="text-4xl mb-4">💎</span>
        <p>Analyze at least {MIN_ANALYZED_FILES} files to extract the key evidence across your case.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b pb-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Key Evidence</h2>
          <p className="text-sm text-slate-500">The facts most likely to move this case - admissions, contradictions, and smoking guns, synthesized across every analyzed document.</p>
        </div>
        <button
          onClick={runGeneration}
          disabled={isLoading}
          className={`shrink-0 px-3 py-1.5 rounded text-sm font-semibold transition-colors ${isLoading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
        >
          {isLoading ? 'Synthesizing...' : hasGenerated ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {isLoading && highlights.length === 0 && (
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          Reviewing {analyzedFiles.length} analyzed documents for the facts that matter most...
        </div>
      )}

      {!isLoading && !error && hasGenerated && highlights.length === 0 && (
        <div className="text-slate-400 italic">No standout facts were identified across the current evidence set.</div>
      )}

      <div className="space-y-4">
        {highlights.map((h, idx) => (
          <div key={idx} className={`rounded-lg border p-4 shadow-sm ${SEVERITY_STYLES[h.severity]}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>{CATEGORY_ICONS[h.category]}</span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{h.category} · {h.severity}</span>
                  <h3 className="font-semibold text-slate-800 leading-snug">{h.headline}</h3>
                </div>
              </div>
            </div>
            {h.explanation && <p className="text-sm text-slate-700 mb-3">{h.explanation}</p>}
            <div className="flex flex-wrap gap-1.5">
              {h.batesReferences.map(bates => {
                const fileId = batesToFileId.get(bates);
                return (
                  <button
                    key={bates}
                    onClick={() => fileId && onSelectFile(fileId)}
                    disabled={!fileId}
                    className="disabled:opacity-50"
                  >
                    <BatesBadge formatted={bates} size="sm" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CaseHighlights;

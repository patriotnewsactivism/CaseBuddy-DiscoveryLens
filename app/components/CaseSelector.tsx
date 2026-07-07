'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Briefcase, Link2, X, ChevronDown } from 'lucide-react';

interface Case {
  id: string;
  name: string;
  status: string;
  case_number?: string | null;
}

interface CaseSelectorProps {
  value?: string | null;
  onChange: (caseId: string | null) => void;
  className?: string;
}

export function CaseSelector({ value, onChange, className = '' }: CaseSelectorProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Case | null>(null);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('cases')
        .select('id, name, status, case_number')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (!error && data) setCases(data as Case[]);
    } catch (e) {
      console.error('Failed to load cases:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCases(); }, [loadCases]);

  useEffect(() => {
    if (value && cases.length > 0) {
      const found = cases.find(c => c.id === value);
      setSelected(found ?? null);
    } else {
      setSelected(null);
    }
  }, [value, cases]);

  const select = (c: Case | null) => {
    setSelected(c);
    onChange(c?.id ?? null);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-500 text-sm text-left transition-colors"
      >
        <Briefcase size={14} className="text-slate-400 shrink-0" />
        <span className="flex-1 truncate text-slate-300">
          {selected ? selected.name : <span className="text-slate-500">Link to Case-Companion case…</span>}
        </span>
        {selected ? (
          <X
            size={14}
            className="text-slate-500 hover:text-red-400 shrink-0 transition-colors"
            onClick={e => { e.stopPropagation(); select(null); }}
          />
        ) : (
          <ChevronDown size={14} className="text-slate-500 shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-center text-slate-400 text-sm">Loading cases…</div>
            ) : cases.length === 0 ? (
              <div className="px-3 py-4 text-center text-slate-500 text-sm">No cases found. Sign in to Case-Companion first.</div>
            ) : (
              <>
                <button
                  onClick={() => select(null)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 transition-colors"
                >
                  <X size={12} /> No linked case
                </button>
                {cases.map(c => (
                  <button
                    key={c.id}
                    onClick={() => select(c)}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
                      selected?.id === c.id ? 'bg-gold-500/20 text-gold-400' : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Link2 size={12} className="shrink-0" />
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.case_number && <span className="text-slate-500 text-xs">{c.case_number}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

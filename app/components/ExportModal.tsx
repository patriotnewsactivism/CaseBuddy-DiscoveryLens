'use client';

import React, { useState } from 'react';
import { DiscoveryFile, ExportFields, DEFAULT_EXPORT_FIELDS, CasePerspective } from '@/lib/types';
import { exportSelectiveCSV, exportSelectiveJSON, exportSelectivePDF } from '@/lib/exportService';

interface ExportModalProps {
  files: DiscoveryFile[];
  projectName: string;
  casePerspective: CasePerspective;
  onClose: () => void;
  /** Optional: record the export in the DB (cloud document ID → format used) */
  onRecordExport?: (documentIds: string[], format: string, fields: ExportFields) => void;
}

const FIELD_LABELS: { key: keyof ExportFields; label: string; description: string }[] = [
  { key: 'summary', label: 'Summary & Evidence Classification', description: 'AI-generated executive summary and evidence category' },
  { key: 'dates', label: 'Extracted Dates & Timeline', description: 'All dates and timestamps found in the document' },
  { key: 'facts', label: 'Key Facts & Inconsistencies', description: 'Important facts and contradictions identified by AI' },
  { key: 'entities', label: 'Entities (People, Orgs, Places)', description: 'Named entities extracted from the document' },
  { key: 'transcription', label: 'OCR / Transcription Text', description: 'Full verbatim text extracted from the document' },
  { key: 'sentiment', label: 'Sentiment Assessment', description: 'Whether the document is Hostile, Cooperative, or Neutral' },
];

const ExportModal: React.FC<ExportModalProps> = ({ files, projectName, casePerspective, onClose, onRecordExport }) => {
  const [fields, setFields] = useState<ExportFields>({ ...DEFAULT_EXPORT_FIELDS });
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);

  const analyzedFiles = files.filter(f => f.analysis);
  const allSelected = Object.values(fields).every(Boolean);

  const toggleField = (key: keyof ExportFields) => {
    setFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const newVal = !allSelected;
    setFields({ summary: newVal, dates: newVal, facts: newVal, entities: newVal, transcription: newVal, sentiment: newVal });
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
    if (analyzedFiles.length === 0) return;
    setIsExporting(true);
    setExportedFormat(null);

    try {
      if (format === 'pdf') {
        exportSelectivePDF(analyzedFiles, projectName, casePerspective, fields);
      } else if (format === 'csv') {
        exportSelectiveCSV(analyzedFiles, projectName, fields);
      } else {
        exportSelectiveJSON(analyzedFiles, projectName, casePerspective, fields);
      }

      setExportedFormat(format.toUpperCase());

      if (onRecordExport) {
        const docIds = analyzedFiles.map(f => f.cloudDocumentId).filter(Boolean) as string[];
        onRecordExport(docIds, format, fields);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const activeFieldCount = Object.values(fields).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-start">
          <div>
            <h2 className="font-serif font-bold text-slate-800 text-lg">Export Analysis Report</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {analyzedFiles.length} of {files.length} document{files.length !== 1 ? 's' : ''} analyzed &middot; {projectName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none mt-0.5">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Include in Export</h3>
              <button
                onClick={toggleAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-2">
              {FIELD_LABELS.map(({ key, label, description }) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    fields[key] ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={fields[key]}
                    onChange={() => toggleField(key)}
                    className="mt-0.5 accent-indigo-600 w-4 h-4 shrink-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-800 block">{label}</span>
                    <span className="text-xs text-slate-500">{description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* No fields warning */}
          {activeFieldCount === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              Select at least one field to export.
            </div>
          )}

          {/* No analyzed files warning */}
          {analyzedFiles.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              No analyzed documents available. Wait for analysis to complete before exporting.
            </div>
          )}

          {/* Success feedback */}
          {exportedFormat && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {exportedFormat} export generated successfully.
            </div>
          )}
        </div>

        {/* Export buttons */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <p className="text-xs text-slate-500 mb-3 text-center">
            Export {activeFieldCount} field{activeFieldCount !== 1 ? 's' : ''} from {analyzedFiles.length} document{analyzedFiles.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting || activeFieldCount === 0 || analyzedFiles.length === 0}
              className="flex flex-col items-center gap-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-semibold"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF Report
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting || activeFieldCount === 0 || analyzedFiles.length === 0}
              className="flex flex-col items-center gap-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-semibold"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV / Excel
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={isExporting || activeFieldCount === 0 || analyzedFiles.length === 0}
              className="flex flex-col items-center gap-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-semibold"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              JSON Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;

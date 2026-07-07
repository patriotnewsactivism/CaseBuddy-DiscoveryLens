'use client';

import React from 'react';
import * as chrono from 'chrono-node';
import { DiscoveryFile } from '@/lib/types';
import BatesBadge from './BatesBadge';

interface TimelineProps {
  files: DiscoveryFile[];
  onSelectFile: (id: string) => void;
}

interface ChronologyEvent {
  key: string;
  rawDate: string;
  parsedDate: Date | null;
  description: string;
  file: DiscoveryFile;
}

/**
 * Build the raw list of chronology events from every analyzed file. Prefers
 * the structured `timelineEvents` field (paired date + description, produced
 * by the analysis prompt) and falls back to the older flat `dates` array for
 * documents analyzed before that field existed, generating a generic
 * description so nothing gets silently dropped from the chronology.
 */
const buildEvents = (files: DiscoveryFile[]): ChronologyEvent[] => {
  const events: ChronologyEvent[] = [];
  const seenPerFile = new Set<string>();

  files.forEach(f => {
    const analysis = f.analysis;
    if (!analysis) return;

    const structured = analysis.timelineEvents;
    if (structured && structured.length > 0) {
      structured.forEach((evt, idx) => {
        const dedupeKey = `${f.id}:${evt.date}:${evt.description}`;
        if (seenPerFile.has(dedupeKey)) return;
        seenPerFile.add(dedupeKey);
        events.push({
          key: `${f.id}-${idx}`,
          rawDate: evt.date,
          parsedDate: chrono.parseDate(evt.date) ?? null,
          description: evt.description,
          file: f,
        });
      });
      return;
    }

    // Legacy fallback: flat date strings with no paired description.
    (analysis.dates || []).forEach((d, idx) => {
      if (!d || d.length <= 4) return;
      const dedupeKey = `${f.id}:${d}`;
      if (seenPerFile.has(dedupeKey)) return;
      seenPerFile.add(dedupeKey);
      events.push({
        key: `${f.id}-legacy-${idx}`,
        rawDate: d,
        parsedDate: chrono.parseDate(d) ?? null,
        description: `Referenced in ${f.name}`,
        file: f,
      });
    });
  });

  return events;
};

const exportCsv = (events: ChronologyEvent[]) => {
  const header = ['Date', 'Description', 'Bates Number', 'Evidence Type', 'File Name'];
  const rows = events.map(e => [
    e.parsedDate ? e.parsedDate.toISOString().slice(0, 10) : e.rawDate,
    e.description,
    e.file.batesNumber.formatted,
    e.file.analysis?.evidenceType || '',
    e.file.name,
  ]);

  const escapeCell = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map(row => row.map(escapeCell).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `case-chronology-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const Timeline: React.FC<TimelineProps> = ({ files, onSelectFile }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [evidenceTypeFilter, setEvidenceTypeFilter] = React.useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = React.useState<string>('all');
  const [showUnparsed, setShowUnparsed] = React.useState(true);

  const allEvents = React.useMemo(() => buildEvents(files), [files]);

  const evidenceTypes = React.useMemo(() => {
    const types = new Set<string>();
    allEvents.forEach(e => {
      if (e.file.analysis?.evidenceType) types.add(e.file.analysis.evidenceType);
    });
    return Array.from(types).sort();
  }, [allEvents]);

  const filteredEvents = React.useMemo(() => {
    return allEvents.filter(e => {
      if (evidenceTypeFilter !== 'all' && e.file.analysis?.evidenceType !== evidenceTypeFilter) return false;
      if (sentimentFilter !== 'all' && e.file.analysis?.sentiment !== sentimentFilter) return false;
      if (searchTerm) {
        const haystack = `${e.description} ${e.file.name} ${e.file.batesNumber.formatted}`.toLowerCase();
        if (!haystack.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [allEvents, evidenceTypeFilter, sentimentFilter, searchTerm]);

  const { dated, undated } = React.useMemo(() => {
    const datedEvents = filteredEvents
      .filter(e => e.parsedDate !== null)
      .sort((a, b) => (a.parsedDate as Date).getTime() - (b.parsedDate as Date).getTime());
    const undatedEvents = filteredEvents.filter(e => e.parsedDate === null);
    return { dated: datedEvents, undated: undatedEvents };
  }, [filteredEvents]);

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>Upload files to generate a timeline of facts.</p>
      </div>
    );
  }

  const renderEventCard = (event: ChronologyEvent, showDateLabel: string) => (
    <div key={event.key} className="mb-8 ml-6 relative">
      <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${event.parsedDate ? 'bg-indigo-600' : 'bg-slate-400'}`}></span>
      <div
        className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onSelectFile(event.file.id)}
      >
        <div className="flex justify-between items-start mb-2 gap-2">
          <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">{showDateLabel}</span>
          <div className="flex items-center gap-2 shrink-0">
            {event.file.analysis?.sentiment && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                event.file.analysis.sentiment === 'Hostile' ? 'bg-red-100 text-red-600' :
                event.file.analysis.sentiment === 'Cooperative' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {event.file.analysis.sentiment}
              </span>
            )}
            <BatesBadge formatted={event.file.batesNumber.formatted} size="sm" />
          </div>
        </div>
        <p className="text-slate-700">{event.description}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-400 italic truncate max-w-[70%]">{event.file.name}</p>
          {event.file.analysis?.evidenceType && (
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{event.file.analysis.evidenceType}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b pb-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800">Case Chronology</h2>
        <button
          onClick={() => exportCsv(filteredEvents)}
          disabled={filteredEvents.length === 0}
          className="text-xs font-semibold px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search events..."
          className="flex-1 min-w-[160px] text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={evidenceTypeFilter}
          onChange={e => setEvidenceTypeFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white"
        >
          <option value="all">All evidence types</option>
          {evidenceTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={sentimentFilter}
          onChange={e => setSentimentFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white"
        >
          <option value="all">All sentiment</option>
          <option value="Hostile">Hostile</option>
          <option value="Cooperative">Cooperative</option>
          <option value="Neutral">Neutral</option>
        </select>
      </div>

      {dated.length === 0 && undated.length === 0 && (
        <div className="ml-6 text-slate-500 italic">No events match the current filters.</div>
      )}

      {dated.length > 0 && (
        <div className="relative border-l-2 border-slate-200 ml-3 space-y-0">
          {dated.map(event =>
            renderEventCard(event, (event.parsedDate as Date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))
          )}
        </div>
      )}

      {undated.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowUnparsed(v => !v)}
            className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-1"
          >
            {showUnparsed ? '▾' : '▸'} Undated / unparsed references ({undated.length})
          </button>
          {showUnparsed && (
            <div className="relative border-l-2 border-dashed border-slate-200 ml-3 space-y-0">
              {undated.map(event => renderEventCard(event, event.rawDate))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Timeline;

'use client';

import React from 'react';
import { DiscoveryFile } from '@/lib/types';
import BatesBadge from './BatesBadge';

interface TimelineProps {
  files: DiscoveryFile[];
  onSelectFile: (id: string) => void;
}

const Timeline: React.FC<TimelineProps> = ({ files, onSelectFile }) => {
  // Aggregate all dates from analyses
  const events = React.useMemo(() => {
    const allEvents: Array<{ date: string; description: string; file: DiscoveryFile }> = [];

    files.forEach(f => {
      if (f.analysis?.dates) {
        f.analysis.dates.forEach(d => {
            // Very basic heuristic to check if it looks like a date/time
            if (d.length > 4) {
                allEvents.push({
                    date: d,
                    description: `Reference in ${f.name}`,
                    file: f
                });
            }
        });
      }
    });

    // Simple sort (lexicographical works roughly for ISO dates, but these are raw strings)
    // In a real app, we'd parse these dates strictly.
    return allEvents.sort((a, b) => a.date.localeCompare(b.date));
  }, [files]);

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-serif font-bold text-slate-800 mb-8 border-b pb-2">Fact Chronology</h2>
      <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
        {events.map((event, idx) => (
          <div key={`${event.file.id}-${idx}`} className="mb-8 ml-6 relative">
            <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-white"></span>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectFile(event.file.id)}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">{event.date}</span>
                <BatesBadge formatted={event.file.batesNumber.formatted} size="sm" />
              </div>
              <p className="text-slate-700">{event.description}</p>
              {event.file.analysis?.summary && (
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic">
                  &ldquo;{event.file.analysis.summary}&rdquo;
                </p>
              )}
            </div>
          </div>
        ))}
        {events.length === 0 && (
            <div className="ml-6 text-slate-500 italic">No specific dates extracted yet. Try analyzing more files.</div>
        )}
      </div>
    </div>
  );
};

export default Timeline;

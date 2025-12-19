'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { DiscoveryFile, FileType } from '@/lib/types';
import BatesBadge from './BatesBadge';

interface FilePreviewProps {
  file: DiscoveryFile;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'analysis' | 'transcription'>('preview');

  const renderPreviewContent = () => {
    switch (file.type) {
      case FileType.IMAGE:
        return (
          <div className="flex justify-center items-center h-full bg-slate-900 relative">
            <Image
              src={file.previewUrl}
              alt={file.name}
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
              priority
            />
          </div>
        );
      case FileType.VIDEO:
        return (
          <div className="flex justify-center items-center h-full bg-slate-900">
            <video src={file.previewUrl} controls className="max-h-full max-w-full" />
          </div>
        );
      case FileType.AUDIO:
        return (
          <div className="flex flex-col justify-center items-center h-full bg-slate-100 p-8">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6 text-indigo-600">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <audio src={file.previewUrl} controls className="w-full max-w-md" />
            <p className="mt-4 text-slate-500 text-sm font-mono">{file.name}</p>
          </div>
        );
      case FileType.DOCUMENT:
      default:
        if (file.mimeType === 'application/pdf') {
             return (
                <iframe src={file.previewUrl} className="w-full h-full" title="PDF Preview"></iframe>
             );
        }
        return (
          <div className="flex flex-col justify-center items-center h-full bg-slate-50 p-8 text-center">
             <div className="w-20 h-20 bg-slate-200 rounded-lg flex items-center justify-center mb-4 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
             </div>
            <p className="text-slate-600 font-medium">Document Preview Unavailable</p>
            <p className="text-slate-400 text-sm mt-2 max-w-xs">
                Switch to the <strong>Analysis</strong> or <strong>Transcription</strong> tab to view the content extracted by Gemini.
            </p>
          </div>
        );
    }
  };

  const renderAnalysisContent = () => {
    if (!file.analysis) return <div className="p-8 text-center text-slate-400">Analysis pending...</div>;

    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
           <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">Executive Summary</h3>
           <p className="text-slate-800 leading-relaxed bg-white p-4 rounded-lg border border-slate-200 shadow-sm">{file.analysis.summary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
              <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">Key Entities</h3>
              <ul className="bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100">
                 {file.analysis.entities.length > 0 ? file.analysis.entities.map((e, i) => (
                   <li key={i} className="px-4 py-2 text-sm text-slate-700">{e}</li>
                 )) : <li className="px-4 py-2 text-sm text-slate-400 italic">None detected</li>}
              </ul>
           </div>
           <div>
              <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">Crucial Dates</h3>
              <ul className="bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100">
                 {file.analysis.dates.length > 0 ? file.analysis.dates.map((d, i) => (
                   <li key={i} className="px-4 py-2 text-sm text-slate-700 font-mono">{d}</li>
                 )) : <li className="px-4 py-2 text-sm text-slate-400 italic">None detected</li>}
              </ul>
           </div>
        </div>

        <div>
           <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">Relevant Facts & Inconsistencies</h3>
           <ul className="list-disc list-inside bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2 text-slate-700">
              {file.analysis.relevantFacts.map((f, i) => <li key={i}>{f}</li>)}
           </ul>
        </div>
      </div>
    );
  };

  const renderTranscriptionContent = () => {
    if (!file.analysis) return <div className="p-8 text-center text-slate-400">Processing transcription...</div>;
    const text = file.analysis.transcription || "No text content found in this file.";

    return (
       <div className="h-full flex flex-col">
          <div className="p-4 bg-yellow-50 border-b border-yellow-100 flex justify-between items-center">
             <span className="text-xs font-bold text-yellow-800 uppercase tracking-wide">
                {file.type === 'AUDIO' || file.type === 'VIDEO' ? 'Verbatim Transcript' : 'Extracted Text'}
             </span>
             <button
               onClick={() => navigator.clipboard.writeText(text)}
               className="text-xs bg-white text-yellow-800 px-2 py-1 rounded border border-yellow-200 hover:bg-yellow-100 transition-colors"
             >
               Copy Text
             </button>
          </div>
          <div className="flex-1 p-6 overflow-auto bg-white">
             <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed max-w-3xl mx-auto">
                {text}
             </pre>
          </div>
       </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-4 overflow-hidden">
            <BatesBadge formatted={file.batesNumber.formatted} size="lg" />
            <div className="flex flex-col min-w-0">
               <span className="font-bold text-slate-800 truncate text-lg" title={file.name}>{file.name}</span>
               <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span className="uppercase">{file.type}</span>
                  <span>•</span>
                  <span>{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                  {file.analysis?.evidenceType && (
                     <>
                       <span>•</span>
                       <span className="text-indigo-600 font-semibold">{file.analysis.evidenceType}</span>
                     </>
                  )}
               </div>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 space-x-6 shrink-0">
         <button
           onClick={() => setActiveTab('preview')}
           className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'preview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
           Media Preview
         </button>
         <button
           onClick={() => setActiveTab('analysis')}
           className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
           AI Analysis
         </button>
         <button
           onClick={() => setActiveTab('transcription')}
           className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transcription' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
           Transcription
         </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative">
        {activeTab === 'preview' && renderPreviewContent()}
        {activeTab === 'analysis' && renderAnalysisContent()}
        {activeTab === 'transcription' && renderTranscriptionContent()}
      </div>
    </div>
  );
};

export default FilePreview;

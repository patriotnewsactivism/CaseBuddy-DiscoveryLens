'use client';

import React, { useState } from 'react';
import { DiscoveryFile, FileType } from '@/lib/types';
import BatesBadge from './BatesBadge';
import TagInput from './TagInput';

interface FilePreviewProps {
  file: DiscoveryFile;
  onExportDocument?: (file: DiscoveryFile) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onExportDocument }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'analysis' | 'transcription' | 'report'>('preview');

  const renderCloudOnlyNotice = () => (
    <div className="flex flex-col justify-center items-center h-full bg-slate-50 p-8 text-center">
      <p className="text-slate-500 text-sm max-w-xs">
        This file was restored from a saved case without a live preview link. Re-open the case document list to refresh its signed URL, or check the Analysis/Transcription tabs.
      </p>
    </div>
  );

  const renderPreviewContent = () => {
    switch (file.type) {
      case FileType.IMAGE: {
        const src = file.previewUrl || file.signedUrl;
        if (!src) return renderCloudOnlyNotice();
        return (
          <div className="flex justify-center items-center h-full bg-slate-900">
            <img src={src} alt={file.name} className="max-h-full max-w-full object-contain" />
          </div>
        );
      }
      case FileType.VIDEO: {
        const src = file.previewUrl || file.signedUrl;
        if (!src) return renderCloudOnlyNotice();
        return (
          <div className="flex justify-center items-center h-full bg-slate-900">
            <video src={src} controls className="max-h-full max-w-full" />
          </div>
        );
      }
      case FileType.AUDIO: {
        const src = file.previewUrl || file.signedUrl;
        return (
          <div className="flex flex-col justify-center items-center h-full bg-slate-100 p-8">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6 text-indigo-600">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            {src ? <audio src={src} controls className="w-full max-w-md" /> : <p className="text-slate-400 text-sm">Preview unavailable - see Transcription tab.</p>}
            <p className="mt-4 text-slate-500 text-sm font-mono">{file.name}</p>
          </div>
        );
      }
      case FileType.DOCUMENT:
      default:
        if (file.mimeType === 'application/pdf') {
             const src = file.previewUrl || file.signedUrl;
             if (!src) return renderCloudOnlyNotice();
             return (
                <iframe src={src} className="w-full h-full" title="PDF Preview"></iframe>
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
                Switch to the <strong>Analysis</strong> or <strong>Transcription</strong> tab to view the content extracted by the AI.
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
                 {(file.analysis.entities?.length ?? 0) > 0 ? file.analysis.entities!.map((e, i) => (
                   <li key={i} className="px-4 py-2 text-sm text-slate-700">{e}</li>
                 )) : <li className="px-4 py-2 text-sm text-slate-400 italic">None detected</li>}
              </ul>
           </div>
           <div>
              <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">Crucial Dates</h3>
              <ul className="bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100">
                 {(file.analysis.dates?.length ?? 0) > 0 ? file.analysis.dates!.map((d, i) => (
                   <li key={i} className="px-4 py-2 text-sm text-slate-700 font-mono">{d}</li>
                 )) : <li className="px-4 py-2 text-sm text-slate-400 italic">None detected</li>}
              </ul>
           </div>
        </div>

        <div>
           <h3 className="text-sm font-bold uppercase text-slate-500 mb-2">Relevant Facts & Inconsistencies</h3>
           <ul className="list-disc list-inside bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2 text-slate-700">
              {(file.analysis.relevantFacts ?? []).map((f, i) => <li key={i}>{f}</li>)}
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

  const renderReportContent = () => {
    if (!file.analysis) {
      return (
        <div className="p-8 text-center text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Analysis pending — report will appear once AI processing is complete.
        </div>
      );
    }

    const { analysis } = file;
    const sentimentColors: Record<string, string> = {
      Hostile: 'bg-red-100 text-red-700 border-red-200',
      Cooperative: 'bg-green-100 text-green-700 border-green-200',
      Neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    const sentimentColor = analysis.sentiment ? sentimentColors[analysis.sentiment] || sentimentColors.Neutral : '';

    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6 pb-10">
        {/* Report Header */}
        <div className="bg-slate-900 text-white rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="text-xs font-mono text-slate-400 mb-1">CASEBUDDY · DISCOVERYLENS</div>
              <h2 className="text-xl font-serif font-bold leading-snug">{file.name}</h2>
            </div>
            <BatesBadge formatted={file.batesNumber.formatted} size="lg" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-white/10 px-2 py-1 rounded">{file.type}</span>
            <span className="bg-indigo-500/80 px-2 py-1 rounded font-semibold">{analysis.evidenceType}</span>
            {analysis.sentiment && (
              <span className={`px-2 py-1 rounded font-semibold border ${sentimentColor}`}>
                {analysis.sentiment}
              </span>
            )}
            <span className="bg-white/10 px-2 py-1 rounded">{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Executive Summary</h3>
          <p className="text-slate-800 leading-relaxed text-sm">{analysis.summary}</p>
        </div>

        {/* Dates & Timeline */}
        {(analysis.dates?.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Extracted Dates &amp; Timeline</h3>
            <div className="space-y-2">
              {analysis.dates?.map((date, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></div>
                  <span className="font-mono text-sm text-slate-700">{date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Facts & Inconsistencies */}
        {(analysis.relevantFacts?.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Key Facts &amp; Inconsistencies</h3>
            <ol className="space-y-3">
              {analysis.relevantFacts?.map((fact, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm text-slate-700 leading-relaxed">{fact}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Entities */}
        {(analysis.entities?.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Entities (People, Organizations, Places)</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.entities?.map((entity, i) => (
                <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
                  {entity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Transcription / OCR */}
        {analysis.transcription && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {file.type === 'AUDIO' || file.type === 'VIDEO' ? 'Verbatim Transcript' : 'OCR / Extracted Text'}
              </h3>
              <button
                onClick={() => navigator.clipboard.writeText(analysis.transcription || '')}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              {analysis.transcription}
            </pre>
          </div>
        )}

        {/* Sentiment */}
        {analysis.sentiment && (
          <div className={`rounded-xl border p-4 ${sentimentColor}`}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">Sentiment Assessment</h3>
            <p className="text-sm font-semibold">{analysis.sentiment}</p>
            <p className="text-xs opacity-70 mt-1">
              {analysis.sentiment === 'Hostile' && 'This document contains content adversarial to your stated case perspective.'}
              {analysis.sentiment === 'Cooperative' && 'This document is supportive or neutral toward your stated case perspective.'}
              {analysis.sentiment === 'Neutral' && 'This document does not have a clear directional bias.'}
            </p>
          </div>
        )}

        {/* Export CTA */}
        {onExportDocument && (
          <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-3">Export this document's analysis report</p>
            <button
              onClick={() => onExportDocument(file)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export This Document
            </button>
          </div>
        )}
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
                   <span>{((file.file?.size ?? file.sizeBytes ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
                   {file.analysis?.evidenceType && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold">{file.analysis.evidenceType}</span>
                      </>
                   )}
                </div>
             </div>
         </div>
         {onExportDocument && file.analysis && (
           <button
             onClick={() => onExportDocument(file)}
             className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
             title="Export this document's analysis"
           >
             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
             Export
           </button>
         )}
       </div>

       {/* Tags Section */}
       <div className="px-6 py-3 bg-white border-b border-slate-200 shrink-0">
         <div className="flex flex-wrap gap-2">
           <span className="text-xs font-medium text-slate-600">Tags:</span>
           <TagInput
             tags={file.tags || []}
             onTagsChange={(tags) => {
               console.log('Tags updated:', tags);
             }}
           />
         </div>
       </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 space-x-6 shrink-0 overflow-x-auto">
         <button
           onClick={() => setActiveTab('preview')}
           className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'preview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
           Media Preview
         </button>
         <button
           onClick={() => setActiveTab('analysis')}
           className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'analysis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
           AI Analysis
         </button>
         <button
           onClick={() => setActiveTab('transcription')}
           className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'transcription' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
           Transcription
         </button>
         <button
           onClick={() => setActiveTab('report')}
           className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'report' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
           </svg>
           Full Report
         </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative">
        {activeTab === 'preview' && renderPreviewContent()}
        {activeTab === 'analysis' && renderAnalysisContent()}
        {activeTab === 'transcription' && renderTranscriptionContent()}
        {activeTab === 'report' && renderReportContent()}
      </div>
    </div>
  );
};

export default FilePreview;


import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ChatMessage, DiscoveryFile, FileType, ViewMode, AnalysisData } from './types';
import { BATES_PREFIX_DEFAULT } from './constants';
import { analyzeFile, chatWithDiscovery } from './services/geminiService';
import FilePreview from './components/FilePreview';
import ChatInterface from './components/ChatInterface';
import BatesBadge from './components/BatesBadge';
import Timeline from './components/Timeline';
import TerminalInterface from './components/TerminalInterface';

// --- Helper Functions ---
const getFileType = (file: File): FileType => {
  if (file.type.startsWith('image/')) return FileType.IMAGE;
  if (file.type.startsWith('video/')) return FileType.VIDEO;
  if (file.type.startsWith('audio/')) return FileType.AUDIO;
  return FileType.DOCUMENT;
};

const formatBates = (num: number): string => {
  const padded = num.toString().padStart(4, '0');
  return `${BATES_PREFIX_DEFAULT}-${padded}`;
};

export default function App() {
  // --- State ---
  const [files, setFiles] = useState<DiscoveryFile[]>([]);
  const [batesCounter, setBatesCounter] = useState(1);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  
  // Refs
  const dirInputRef = useRef<HTMLInputElement>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- Handlers ---

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    setIsScanning(true);
    const newFiles: DiscoveryFile[] = [];
    let currentCounter = batesCounter;

    // Fix: Explicitly cast Array.from result to File[] to avoid 'unknown' type issues in filter and subsequent loops
    const fileArray = (Array.from(uploadedFiles) as File[]).filter((file: File) => {
       const type = getFileType(file);
       // Skip unknown system files like .DS_Store or Thumbs.db
       return type !== FileType.UNKNOWN && !file.name.startsWith('.');
    });

    for (const file of fileArray) {
      const id = crypto.randomUUID();
      const batesFormatted = formatBates(currentCounter);
      
      const newDiscoveryFile: DiscoveryFile = {
        id,
        file,
        name: file.name,
        type: getFileType(file),
        mimeType: file.type,
        batesNumber: {
          prefix: BATES_PREFIX_DEFAULT,
          number: currentCounter,
          formatted: batesFormatted
        },
        previewUrl: URL.createObjectURL(file),
        isProcessing: true,
        analysis: null
      };

      newFiles.push(newDiscoveryFile);
      currentCounter++;
    }

    setFiles(prev => [...prev, ...newFiles]);
    setBatesCounter(currentCounter);
    setIsScanning(false);

    // Trigger analysis for each file independently in parallel
    newFiles.forEach(f => processFileAnalysis(f));

  }, [batesCounter]);

  const processFileAnalysis = async (file: DiscoveryFile) => {
    try {
      const analysis: AnalysisData = await analyzeFile(file);
      
      setFiles(prev => prev.map(f => {
        if (f.id === file.id) {
          return { ...f, isProcessing: false, analysis };
        }
        return f;
      }));
    } catch (error) {
      console.error(`Failed to analyze ${file.name}`, error);
      setFiles(prev => prev.map(f => {
        if (f.id === file.id) {
          return { 
            ...f, 
            isProcessing: false, 
            analysis: {
                summary: "Error processing file.",
                evidenceType: "Unknown",
                entities: [],
                dates: [],
                relevantFacts: ["Analysis failed."],
                transcription: "N/A"
            } 
          };
        }
        return f;
      }));
    }
  };

  const handleSelectFile = (id: string) => {
    setSelectedFileId(id);
    setViewMode(ViewMode.EVIDENCE_VIEWER);
  };

  const handleSendMessage = async (text: string) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setIsChatLoading(true);

    try {
      const activeId = viewMode === ViewMode.EVIDENCE_VIEWER ? selectedFileId : null;
      const responseText = await chatWithDiscovery(text, files, activeId);
      const responseMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: responseText,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, responseMessage]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatLoading(false);
    }
  };

  const triggerHunt = () => {
    dirInputRef.current?.click();
  };

  const selectedFile = files.find(f => f.id === selectedFileId);

  // --- Filtering & Grouping ---
  
  const filteredFiles = useMemo(() => {
    return files.filter(f => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.batesNumber.formatted.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.analysis?.evidenceType || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  const filesByCategory = useMemo(() => {
    const groups: Record<string, DiscoveryFile[]> = {};
    filteredFiles.forEach(f => {
      const type = f.analysis?.evidenceType || (f.isProcessing ? 'Processing...' : 'Uncategorized');
      if (!groups[type]) groups[type] = [];
      groups[type].push(f);
    });
    return groups;
  }, [filteredFiles]);

  // --- Render ---

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      
      {/* Hidden Folder Picker */}
      <input 
        type="file" 
        ref={dirInputRef}
        className="hidden"
        onChange={handleFileUpload}
        // These attributes enable folder selection in modern browsers
        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
      />

      {/* Header */}
      <header className="bg-slate-900 text-white h-16 flex items-center justify-between px-6 shadow-md z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
               <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
               <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-serif tracking-wide">DiscoveryLens</h1>
        </div>
        
        <div className="flex items-center space-x-4">
           <button 
             onClick={() => setViewMode(ViewMode.CLI)}
             className={`px-3 py-1 rounded text-xs font-mono border transition-all ${viewMode === ViewMode.CLI ? 'bg-indigo-600 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
           >
             TERMINAL_MODE
           </button>
           <span className="flex items-center space-x-1 text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
             <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
             <span>{isScanning ? 'Scraping Target...' : 'System Idle'}</span>
           </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Organized Evidence System */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
            {/* Folder Scraper Trigger */}
            <div className="p-4 border-b border-slate-200">
              <button 
                onClick={triggerHunt}
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-all group"
              >
                  <div className="flex flex-col items-center justify-center pt-2">
                      <svg className="w-6 h-6 mb-1 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                      <p className="text-xs text-slate-500 font-bold group-hover:text-indigo-600">Scrape Local Folder</p>
                      <p className="text-[10px] text-slate-400">Deep Discovery Hunt</p>
                  </div>
              </button>
            </div>
            
            {/* Search Filter */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
               <div className="relative">
                 <input 
                    type="text" 
                    placeholder="Search Bates or Keywords..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                 />
                 <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 </svg>
               </div>
            </div>

            {/* File List Grouped by Category */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {Object.keys(filesByCategory).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                  {files.length > 0 ? "No index matches." : "Start a hunt to begin."}
                </div>
              ) : (
                Object.entries(filesByCategory).map(([category, categoryFiles]: [string, DiscoveryFile[]]) => (
                  <div key={category} className="border-b border-slate-100 last:border-0">
                    <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100 z-10">
                      {category} ({categoryFiles.length})
                    </div>
                    <div>
                      {categoryFiles.map(file => (
                        <div 
                          key={file.id} 
                          onClick={() => handleSelectFile(file.id)}
                          className={`p-3 pl-6 border-b border-slate-100 cursor-pointer hover:bg-indigo-50 transition-colors ${selectedFileId === file.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <BatesBadge formatted={file.batesNumber.formatted} size="sm" />
                            {file.isProcessing ? (
                              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : null}
                          </div>
                          <p className="text-sm font-medium text-slate-700 truncate mb-0.5">{file.name}</p>
                          <div className="flex items-center space-x-2">
                             <span className="text-[10px] text-slate-400 uppercase">{file.type}</span>
                             {file.analysis?.sentiment && (
                                <span className={`text-[10px] px-1 rounded ${
                                  file.analysis.sentiment === 'Hostile' ? 'bg-red-100 text-red-600' : 
                                  file.analysis.sentiment === 'Cooperative' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {file.analysis.sentiment}
                                </span>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>

        {/* Center: Viewer / Dashboard / CLI */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-100 relative">
          
          {/* View Toggle Bar */}
          {viewMode !== ViewMode.CLI && (
            <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 space-x-6">
               <button 
                onClick={() => { setSelectedFileId(null); setViewMode(ViewMode.DASHBOARD); }}
                className={`text-sm font-medium h-full border-b-2 px-1 transition-all ${viewMode === ViewMode.DASHBOARD ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                 Overview
               </button>
               <button 
                onClick={() => { if(selectedFileId) setViewMode(ViewMode.EVIDENCE_VIEWER); }}
                disabled={!selectedFileId}
                className={`text-sm font-medium h-full border-b-2 px-1 transition-all ${viewMode === ViewMode.EVIDENCE_VIEWER ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 disabled:opacity-30'}`}
               >
                 Evidence Viewer
               </button>
               <button 
                 onClick={() => setViewMode(ViewMode.TIMELINE)}
                 className={`text-sm font-medium h-full border-b-2 px-1 transition-all ${viewMode === ViewMode.TIMELINE ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
               >
                 Chronology
               </button>
            </div>
          )}

          {/* View Content */}
          <div className={`flex-1 overflow-auto ${viewMode === ViewMode.CLI ? 'p-0' : 'p-4'}`}>
             {viewMode === ViewMode.CLI && (
               <TerminalInterface 
                 files={files} 
                 onSelectFile={handleSelectFile} 
                 onAskAI={handleSendMessage}
                 onSetViewMode={setViewMode}
                 onTriggerHunt={triggerHunt}
                 isScanning={isScanning}
               />
             )}

             {viewMode === ViewMode.DASHBOARD && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 col-span-full">
                       <h2 className="text-lg font-serif font-bold text-slate-800 mb-2">Target Index Summary</h2>
                       <div className="flex space-x-8 text-sm">
                          <div>
                            <span className="block text-slate-400">Total evidence</span>
                            <span className="text-2xl font-bold text-slate-800">{files.length}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400">Audio/Video</span>
                            <span className="text-2xl font-bold text-indigo-600">{files.filter(f => f.type === FileType.AUDIO || f.type === FileType.VIDEO).length}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400">Documents</span>
                            <span className="text-2xl font-bold text-slate-600">{files.filter(f => f.type === FileType.DOCUMENT).length}</span>
                          </div>
                       </div>
                    </div>
                    
                    {files.filter(f => f.analysis).slice(-12).reverse().map(file => (
                       <div key={file.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-48" onClick={() => handleSelectFile(file.id)}>
                          <div className="flex justify-between items-start mb-2">
                             <BatesBadge formatted={file.batesNumber.formatted} size="sm" />
                             <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full truncate max-w-[100px]">{file.analysis?.evidenceType}</span>
                          </div>
                          <h3 className="font-semibold text-slate-800 text-sm truncate mb-2">{file.name}</h3>
                          <p className="text-xs text-slate-500 line-clamp-3 mb-2 flex-1">{file.analysis?.summary}</p>
                          <div className="mt-auto pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                             <span>{file.type}</span>
                             <span>{file.analysis?.entities.length || 0} Entities</span>
                          </div>
                       </div>
                    ))}
                </div>
             )}

             {viewMode === ViewMode.EVIDENCE_VIEWER && selectedFile && (
               <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <FilePreview file={selectedFile} />
               </div>
             )}
             
             {viewMode === ViewMode.TIMELINE && (
                 <Timeline files={files} onSelectFile={handleSelectFile} />
             )}
          </div>

        </div>

        {/* Right Sidebar: AI Assistant (Hidden in CLI) */}
        {viewMode !== ViewMode.CLI && (
          <div className="w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="font-serif font-bold text-slate-700">Discovery AI</h2>
              <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">Reasoning Engine</span>
            </div>
            <div className="flex-1 overflow-hidden">
               <ChatInterface 
                  messages={chatMessages} 
                  onSendMessage={handleSendMessage} 
                  isLoading={isChatLoading}
               />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

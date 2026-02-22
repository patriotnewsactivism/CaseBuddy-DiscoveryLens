'use client';


import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ChatMessage, DiscoveryFile, FileType, ViewMode, AnalysisData, PresignedUpload, ProjectFileDescriptor, Project, CasePerspective } from '@/lib/types';
import { BATES_PREFIX_DEFAULT } from '@/lib/constants';
import { analyzeFile, chatWithDiscovery } from '@/lib/geminiService';
import { createProject, saveDocumentToCloud, updateDocumentAnalysis, updateDocumentStatus } from '@/lib/discoveryService';
import FilePreview from '@/app/components/FilePreview';
import ChatInterface from '@/app/components/ChatInterface';
import BatesBadge from '@/app/components/BatesBadge';
import Timeline from '@/app/components/Timeline';
import TerminalInterface from '@/app/components/TerminalInterface';

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
  const [projectName, setProjectName] = useState('Untitled Project');
  const [activeMobilePanel, setActiveMobilePanel] = useState<'files' | 'content' | 'chat'>('content');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastManifestKey, setLastManifestKey] = useState<string | null>(null);
  const [casePerspective, setCasePerspective] = useState<CasePerspective>(CasePerspective.CLIENT);

  // Cloud Storage State
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isInitializingProject, setIsInitializingProject] = useState(false);

  // Refs
  const dirInputRef = useRef<HTMLInputElement>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const perspectiveOptions = [
    { value: CasePerspective.CLIENT, label: 'My matter', hint: 'Assess hostile/friendly to me' },
    { value: CasePerspective.DEFENSE_SUPPORT, label: 'Supporting defendant', hint: 'Flag items harming defense' },
    { value: CasePerspective.PLAINTIFF_SUPPORT, label: 'Supporting plaintiff', hint: 'Flag items harming plaintiff' },
  ];

  // Initialize project on mount
  useEffect(() => {
    initializeProject();
  }, []);

  const initializeProject = async () => {
    setIsInitializingProject(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const { project } = await createProject(
        `Discovery ${timestamp}`,
        'Created automatically',
        BATES_PREFIX_DEFAULT
      );
      setCurrentProject(project);
      setBatesCounter(project.bates_counter);
      setProjectName(project.name);
      console.log('Project initialized:', project);
    } catch (error) {
      console.error('Failed to initialize project:', error);
      const message = error instanceof Error ? error.message : 'Failed to initialize project.';
      setSaveError(message);
    } finally {
      setIsInitializingProject(false);
    }
  };

  // --- Handlers ---

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        analysis: null,
        analysisError: null
      };

      newFiles.push(newDiscoveryFile);
      currentCounter++;
    }

    setFiles(prev => [...prev, ...newFiles]);
    setBatesCounter(currentCounter);
    setIsScanning(false);

    // Trigger analysis for each file independently in parallel
    newFiles.forEach(f => processFileAnalysis(f));
  };

  const processFileAnalysis = async (file: DiscoveryFile) => {
    let analysisTarget = file;
    try {
      // Step 1: Save file to cloud storage first
      if (currentProject) {
        try {
          const { documentId, storagePath, signedUrl } = await saveDocumentToCloud(file, currentProject.id);
          analysisTarget = { ...file, cloudDocumentId: documentId, storagePath, signedUrl };

          // Update file with cloud storage info
          setFiles(prev => prev.map(f => {
            if (f.id === file.id) {
              return { ...f, cloudDocumentId: documentId, storagePath, signedUrl, analysisError: null };
            }
            return f;
          }));
        } catch (storageError) {
          console.error(`Failed to save ${file.name} to cloud:`, storageError);
          setSaveError(`Failed to save ${file.name} to cloud storage`);
        }
      }

      // Step 2: Analyze the file
      const analysis: AnalysisData = await analyzeFile(analysisTarget, casePerspective);

      // Step 3: Update local state
      setFiles(prev => prev.map(f => {
        if (f.id === file.id) {
          return { ...f, isProcessing: false, analysis, analysisError: null };
        }
        return f;
      }));

      // Step 4: Update analysis in cloud storage
      if (currentProject && analysisTarget.cloudDocumentId) {
        try {
          await updateDocumentAnalysis(analysisTarget.cloudDocumentId, analysis);
          console.log(`Analysis saved to cloud for ${file.name}`);
        } catch (updateError) {
          console.error(`Failed to update analysis for ${file.name}:`, updateError);
        }
      }
    } catch (error) {
      console.error(`Failed to analyze ${file.name}`, error);
      setFiles(prev => prev.map(f => {
        if (f.id === file.id) {
          return {
            ...f,
            isProcessing: false,
            analysis: null,
            analysisError: error instanceof Error ? error.message : 'Analysis failed.',
          };
        }
        return f;
      }));

      if (currentProject && analysisTarget.cloudDocumentId) {
        try {
          await updateDocumentStatus(analysisTarget.cloudDocumentId, 'failed', 'Analysis failed');
        } catch (statusError) {
          console.error(`Failed to update cloud status for ${file.name}:`, statusError);
        }
      }
    }
  };

  const handleRetryAnalysis = (fileId: string) => {
    const target = files.find(f => f.id === fileId);
    if (!target) return;

    setFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        return { ...f, isProcessing: true, analysisError: null };
      }
      return f;
    }));

    processFileAnalysis({ ...target, isProcessing: true, analysis: null, analysisError: null });
  };

  const handleSelectFile = (id: string) => {
    setSelectedFileId(id);
    setViewMode(ViewMode.EVIDENCE_VIEWER);
    setActiveMobilePanel('content');
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
      const responseText = await chatWithDiscovery(text, files, activeId, casePerspective);
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

  const handleSaveProject = useCallback(async () => {
    if (!projectName.trim()) {
      setSaveError('Name your project before saving.');
      setSaveMessage(null);
      return;
    }

    if (files.length === 0) {
      setSaveError('Add evidence files before saving to the cloud.');
      setSaveMessage(null);
      return;
    }

    setIsSavingProject(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const presignResponse = await fetch('/api/projects/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectName.trim(),
          files: files.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
        }),
      });

      if (!presignResponse.ok) {
        const errorData = await presignResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Unable to prepare cloud uploads.');
      }

      const { uploads } = (await presignResponse.json()) as { uploads: PresignedUpload[] };
      const uploadMap = new Map(uploads.map(upload => [upload.id, upload]));

      for (const file of files) {
        const upload = uploadMap.get(file.id);
        if (!upload) {
          throw new Error(`Missing upload URL for ${file.name}`);
        }

        const uploadResult = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.mimeType },
          body: file.file,
        });

        if (!uploadResult.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }
      }

      const manifestPayload = {
        projectName: projectName.trim(),
        casePerspective,
        files: files.map<ProjectFileDescriptor>(f => {
          const upload = uploadMap.get(f.id);
          return {
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            size: f.file.size,
            batesNumber: f.batesNumber,
            analysis: f.analysis,
            storageKey: upload?.objectKey,
          };
        }),
      };

      const saveResponse = await fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manifestPayload),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Unable to save project manifest.');
      }

      const saveData = await saveResponse.json();
      setSaveMessage('Project saved to cloud storage.');
      setLastManifestKey(saveData.manifestKey || null);
    } catch (error: any) {
      setSaveError(error?.message || 'Unable to save project.');
    } finally {
      setIsSavingProject(false);
    }
  }, [files, projectName, casePerspective]);

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
    <div className="flex flex-col min-h-screen bg-slate-100 overflow-hidden">
      
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
      <header className="bg-slate-900 text-white px-4 md:px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-md z-10 shrink-0 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
               <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
               <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-serif tracking-wide">DiscoveryLens</h1>
            <p className="text-xs text-slate-300">Mobile-friendly legal discovery cockpit</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 w-full sm:w-auto">
           <div className="flex flex-wrap items-center justify-end gap-2">
             <button 
               onClick={() => { setViewMode(ViewMode.CLI); setActiveMobilePanel('content'); }}
               className={`px-3 py-1 rounded text-[11px] font-mono border transition-all ${viewMode === ViewMode.CLI ? 'bg-indigo-600 border-indigo-500 ring-2 ring-indigo-500/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
             >
               TERMINAL_MODE
             </button>
             <span className="flex items-center space-x-1 text-[11px] text-slate-300 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
               <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
               <span>{isScanning ? 'Scraping Target...' : 'System Idle'}</span>
             </span>
             {lastManifestKey && (
               <span className="text-[11px] text-emerald-200 bg-emerald-900/40 px-2 py-1 rounded-full border border-emerald-700">
                 Cloud saved
               </span>
             )}
           </div>
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
             <div className="flex items-center gap-2 w-full sm:w-80">
               <label className="sr-only" htmlFor="project-name">Project name</label>
               <input
                 id="project-name"
                 type="text"
                 value={projectName}
                 onChange={(e) => setProjectName(e.target.value)}
                 className="flex-1 text-sm bg-slate-800 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                 placeholder="Name this project..."
               />
               <button
                 onClick={handleSaveProject}
                 disabled={isSavingProject}
                 className={`px-3 py-2 rounded text-sm font-semibold transition-colors ${isSavingProject ? 'bg-slate-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'} text-white shadow`}
               >
                 {isSavingProject ? 'Saving...' : 'Save to Cloud'}
               </button>
             </div>
             <div className="text-xs min-h-[20px] text-right">
               {saveMessage && <span className="text-emerald-200">{saveMessage}</span>}
               {saveError && <span className="text-amber-200">{saveError}</span>}
             </div>
           </div>
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
             <span className="text-[11px] uppercase font-semibold text-slate-300">Case perspective</span>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
               {perspectiveOptions.map(option => (
                 <button
                   key={option.value}
                   onClick={() => setCasePerspective(option.value)}
                   className={`flex flex-col items-start px-3 py-2 rounded border text-left transition-all ${
                     casePerspective === option.value
                       ? 'bg-indigo-600 border-indigo-400 text-white shadow'
                       : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                   }`}
                 >
                   <span className="text-xs font-semibold">{option.label}</span>
                   <span className="text-[11px] text-slate-200/80">{option.hint}</span>
                 </button>
               ))}
             </div>
           </div>
        </div>
      </header>

      {/* Mobile navigation */}
      <div className="md:hidden bg-white border-b border-slate-200 flex justify-between px-2 py-2 gap-2 sticky top-[64px] z-10">
        {[
          { key: 'files', label: 'Files' },
          { key: 'content', label: 'Workspace' },
          { key: 'chat', label: 'AI' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveMobilePanel(tab.key as 'files' | 'content' | 'chat')}
            className={`flex-1 text-sm font-semibold px-3 py-2 rounded border ${activeMobilePanel === tab.key ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        
        {/* Left Sidebar: Organized Evidence System */}
        <div className={`md:w-80 w-full bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 ${activeMobilePanel === 'files' ? 'flex' : 'hidden md:flex'}`}>
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
        <div className={`flex-1 flex flex-col min-w-0 bg-slate-100 relative ${activeMobilePanel === 'content' ? 'flex' : 'hidden md:flex'}`}>
          
          {/* View Toggle Bar */}
          {viewMode !== ViewMode.CLI && (
            <div className="h-12 bg-white border-b border-slate-200 flex items-center px-3 md:px-4 space-x-4 md:space-x-6 overflow-x-auto">
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
                       <div className="flex flex-wrap gap-6 text-sm">
                          <div className="min-w-[120px]">
                            <span className="block text-slate-400">Total evidence</span>
                            <span className="text-2xl font-bold text-slate-800">{files.length}</span>
                          </div>
                          <div className="min-w-[120px]">
                            <span className="block text-slate-400">Audio/Video</span>
                            <span className="text-2xl font-bold text-indigo-600">{files.filter(f => f.type === FileType.AUDIO || f.type === FileType.VIDEO).length}</span>
                          </div>
                          <div className="min-w-[120px]">
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
                  {selectedFile.analysisError && (
                    <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-red-800">Analysis failed</p>
                        <p className="text-xs text-red-700">{selectedFile.analysisError}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRetryAnalysis(selectedFile.id)}
                          className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                          disabled={selectedFile.isProcessing}
                        >
                          {selectedFile.isProcessing ? 'Retrying...' : 'Retry analysis'}
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(selectedFile.analysisError || '')}
                          className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-700 bg-white hover:bg-red-100 transition-colors"
                        >
                          Copy error
                        </button>
                      </div>
                    </div>
                  )}
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
          <div className={`md:w-96 w-full bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0 z-10 ${activeMobilePanel === 'chat' ? 'flex' : 'hidden md:flex'}`}>
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

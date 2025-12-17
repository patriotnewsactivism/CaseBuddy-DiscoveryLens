import React, { useState, useRef, useEffect } from 'react';
import { DiscoveryFile, ViewMode } from '../types';

interface TerminalInterfaceProps {
  files: DiscoveryFile[];
  onSelectFile: (id: string) => void;
  onAskAI: (query: string) => void;
  onSetViewMode: (mode: ViewMode) => void;
  onTriggerHunt: () => void;
  isScanning?: boolean;
}

interface LogEntry {
  type: 'input' | 'output' | 'error' | 'success' | 'system';
  content: React.ReactNode;
}

const TerminalInterface: React.FC<TerminalInterfaceProps> = ({ 
  files, 
  onSelectFile, 
  onAskAI, 
  onSetViewMode,
  onTriggerHunt,
  isScanning = false
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<LogEntry[]>([
    { type: 'success', content: 'DiscoveryLens CLI v1.1.0 [Ready]' },
    { type: 'system', content: 'SYSTEM: Waiting for target directory. Type "hunt" to begin ingestion.' }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [history]);

  // Effect to show live processing status
  useEffect(() => {
    if (isScanning) {
       addLog('system', 'SCANNER: Accessing local file handles...');
    }
  }, [isScanning]);

  const addLog = (type: LogEntry['type'], content: React.ReactNode) => {
    setHistory(prev => [...prev, { type, content }]);
  };

  const handleCommand = (cmd: string) => {
    const parts = cmd.trim().split(' ');
    const action = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    addLog('input', `> ${cmd}`);

    switch (action) {
      case 'help':
        addLog('output', (
          <div className="space-y-1 my-2 border-l-2 border-indigo-900 pl-4">
            <p className="text-indigo-400 font-bold">CORE COMMANDS:</p>
            <p><span className="text-emerald-400 w-24 inline-block">hunt</span> - Select a folder to set the scraper loose</p>
            <p><span className="text-emerald-400 w-24 inline-block">ls</span> - List all currently indexed discovery items</p>
            <p><span className="text-emerald-400 w-24 inline-block">status</span> - Show ingestion and processing progress</p>
            <p><span className="text-emerald-400 w-24 inline-block">inspect [B]</span> - Print AI analysis for Bates [B]</p>
            <p><span className="text-emerald-400 w-24 inline-block">read [B]</span> - Dump full transcription for Bates [B]</p>
            <p><span className="text-emerald-400 w-24 inline-block">ask [Q]</span> - Cross-reference the entire folder with AI</p>
            <p><span className="text-emerald-400 w-24 inline-block">clear</span> - Flush terminal buffer</p>
          </div>
        ));
        break;

      case 'hunt':
        addLog('system', 'HUNT: Requesting directory permissions from OS...');
        onTriggerHunt();
        break;

      case 'status':
        const processing = files.filter(f => f.isProcessing).length;
        const total = files.length;
        addLog('output', (
          <div className="my-2">
            <p>Total Files Found: <span className="text-white font-bold">{total}</span></p>
            <p>Ready for Inquiry: <span className="text-emerald-500 font-bold">{total - processing}</span></p>
            <p>Background Threads: <span className="text-amber-500 font-bold">{processing} active</span></p>
            <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: total ? `${((total - processing) / total) * 100}%` : '0%' }}
                ></div>
            </div>
          </div>
        ));
        break;

      case 'ls':
        if (files.length === 0) {
          addLog('error', 'Index is empty. Type "hunt" to ingest evidence.');
        } else {
          addLog('output', (
            <div className="max-h-64 overflow-y-auto mt-2 pr-2 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-950">
                  <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase">
                    <th className="py-1">Bates</th>
                    <th className="py-1">Type</th>
                    <th className="py-1">Category</th>
                    <th className="py-1">Health</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {files.map(f => (
                    <tr key={f.id} className="hover:bg-slate-900/50 border-b border-slate-900/30">
                      <td className="py-1.5 text-emerald-500 font-bold">{f.batesNumber.formatted}</td>
                      <td className="py-1.5 text-slate-400">{f.type}</td>
                      <td className="py-1.5 text-indigo-400">{f.analysis?.evidenceType || 'SCANNING...'}</td>
                      <td className="py-1.5">
                        {f.isProcessing ? <span className="text-amber-500">INGESTING</span> : <span className="text-emerald-500">INDEXED</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ));
        }
        break;

      case 'inspect':
      case 'read':
        const targetBates = args.toUpperCase();
        const file = files.find(f => f.batesNumber.formatted === targetBates);
        if (!file) {
          addLog('error', `ERR: Bates "${targetBates}" does not exist in local index.`);
        } else if (file.isProcessing) {
          addLog('system', `WAIT: ${targetBates} is still in reasoning pipeline...`);
        } else if (!file.analysis) {
          addLog('error', `ERR: No intelligence data for ${targetBates}.`);
        } else {
          if (action === 'inspect') {
            addLog('output', (
              <div className="bg-slate-900/50 p-4 rounded mt-2 border border-slate-800 shadow-inner">
                <p className="text-indigo-400 font-bold mb-2 flex items-center">
                  <span className="mr-2">📁</span> {file.name}
                </p>
                <div className="space-y-3 text-sm">
                  <p><span className="text-slate-500 font-bold uppercase text-[10px]">Executive Summary:</span><br/>{file.analysis.summary}</p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px]">Entities Tagged:</span><br/><span className="text-indigo-300">{file.analysis.entities.join(', ')}</span></p>
                  <p><span className="text-slate-500 font-bold uppercase text-[10px]">Facts Found:</span><br/>{file.analysis.relevantFacts.map((fact, i) => <span key={i} className="block">• {fact}</span>)}</p>
                </div>
              </div>
            ));
          } else {
            addLog('output', (
              <div className="bg-slate-900 p-4 rounded mt-2 border border-slate-800 max-h-96 overflow-y-auto">
                <p className="text-yellow-500 font-bold mb-2 underline tracking-widest text-xs">RAW TEXT DUMP: {targetBates}</p>
                <pre className="whitespace-pre-wrap text-[11px] text-slate-300 font-mono leading-relaxed">
                  {file.analysis.transcription || "System reported 0 text characters found in object."}
                </pre>
              </div>
            ));
          }
        }
        break;

      case 'ask':
        if (!args) {
          addLog('error', 'ERR: Query missing. Usage: ask [question]');
        } else {
          onAskAI(args);
          addLog('system', `AI: Cross-referencing folder for "${args}"...`);
        }
        break;

      case 'clear':
        setHistory([]);
        break;

      default:
        addLog('error', `SHELL: Command "${action}" not found. Type "help".`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleCommand(input);
      setInput('');
    }
  };

  return (
    <div 
      className="h-full bg-slate-950 font-mono text-slate-300 flex flex-col p-6 overflow-hidden relative shadow-2xl"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Visual Glitch/Terminal Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 mb-4 scroll-smooth" ref={scrollRef}>
        {history.map((entry, i) => (
          <div key={i} className={`whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300 ${
            entry.type === 'error' ? 'text-rose-500' : 
            entry.type === 'success' ? 'text-emerald-500' : 
            entry.type === 'system' ? 'text-indigo-400 italic opacity-80' :
            entry.type === 'input' ? 'text-white font-bold' : ''
          }`}>
            {entry.content}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="flex items-center shrink-0 border-t border-slate-800/50 pt-4 pb-2">
        <span className="text-emerald-500 mr-2 font-bold font-mono tracking-tighter">discovery@lens:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-white caret-emerald-500 focus:ring-0 p-0 placeholder-slate-700"
          placeholder={history.length < 5 ? "try 'hunt'" : ""}
          autoFocus
        />
      </form>
    </div>
  );
};

export default TerminalInterface;
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/types';
import BatesBadge from './BatesBadge';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  // Helper to highlight Bates numbers in text
  const renderMessageContent = (text: string) => {
    // Regex to find [DEF-XXX] patterns
    const parts = text.split(/(\[[A-Z]+-\d+\])/g);

    return parts.map((part, i) => {
      if (part.match(/^\[[A-Z]+-\d+\]$/)) {
        return (
           <span key={i} className="inline-block align-middle mx-1">
             <BatesBadge formatted={part.replace(/[\[\]]/g, '')} size="sm" className="cursor-pointer hover:bg-slate-700" />
           </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center mt-20 text-slate-400">
            <h3 className="text-lg font-serif text-slate-600 mb-2">Discovery Assistant</h3>
            <p className="text-sm">Ask questions about inconsistencies, timelines, or specific evidence.</p>
            <div className="mt-6 grid grid-cols-1 gap-2 max-w-xs mx-auto">
              <button onClick={() => onSendMessage('Create a chronological timeline of events.')} className="text-xs bg-white border border-slate-200 p-2 rounded hover:bg-indigo-50 text-left transition-colors">
                &ldquo;Create a timeline of events.&rdquo;
              </button>
              <button onClick={() => onSendMessage('Are there any contradictions in the witness statements?')} className="text-xs bg-white border border-slate-200 p-2 rounded hover:bg-indigo-50 text-left transition-colors">
                &ldquo;Are there contradictions?&rdquo;
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-800 border border-slate-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{renderMessageContent(msg.content)}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
               <div className="flex space-x-1">
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the evidence..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;

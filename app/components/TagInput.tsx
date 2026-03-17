'use client';

import React, { useState } from 'react';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ 
  tags, 
  onTagsChange, 
  placeholder = 'Add tags...' 
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
      setInputValue('');
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue.trim());
      setInputValue('');
    }
  };

  const addTag = (tag: string) => {
    if (!tag || tags.includes(tag)) return;
    onTagsChange([...tags, tag]);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.map((tag, index) => (
        <span 
          key={index} 
          className="flex items-center bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="ml-1 text-indigo-600 hover:text-indigo-800"
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      
      {!tags.length && (
        <span className="text-xs text-slate-400 italic">
          No tags
        </span>
      )}
      
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );
};

export default TagInput;
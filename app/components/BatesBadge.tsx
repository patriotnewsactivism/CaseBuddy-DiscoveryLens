'use client';

import React from 'react';

interface BatesBadgeProps {
  formatted: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BatesBadge: React.FC<BatesBadgeProps> = ({ formatted, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5 font-bold',
  };

  return (
    <span className={`inline-flex items-center rounded-sm bg-slate-800 text-white font-mono tracking-wider border border-slate-600 shadow-sm ${sizeClasses[size]} ${className}`}>
      {formatted}
    </span>
  );
};

export default BatesBadge;

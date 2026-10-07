import React from 'react';

export default function LoadingRow({ count = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-[6px] border border-wl-border bg-wl-surface/60 flex items-center px-3 gap-3"
        >
          <div className="w-2 h-2 rounded-full bg-wl-border shrink-0" />
          <div className="h-3 w-1/3 rounded-[4px] bg-wl-border/60" />
          <div className="h-3 w-1/4 rounded-[4px] bg-wl-border/40 ml-auto" />
        </div>
      ))}
    </div>
  );
}

import React from 'react';

export default function EmptyState({
  title = 'No items found',
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`p-6 text-center rounded-[6px] border border-wl-border bg-wl-surface/50 font-sans ${className}`}
    >
      <h3 className="text-[13px] font-medium text-wl-text">{title}</h3>
      {description && (
        <p className="text-[11px] text-wl-muted mt-1 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

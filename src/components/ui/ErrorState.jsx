import React from 'react';
import Button from './Button';

export default function ErrorState({
  title = 'Analysis Failed',
  message,
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`p-4 rounded-[6px] border border-[#f85149]/30 bg-[#f85149]/5 font-sans space-y-2.5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[#f85149]">{title}</h3>
          <p className="text-[12px] text-wl-muted mt-1 leading-relaxed">
            {message || 'An unexpected error occurred while executing this check.'}
          </p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

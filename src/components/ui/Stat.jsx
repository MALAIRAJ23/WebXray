import React from 'react';

const STATUS_VALUE_COLORS = {
  normal: 'text-wl-text',
  good: 'text-[#3fb950]',
  warning: 'text-[#d29922]',
  error: 'text-[#f85149]',
  accent: 'text-[#4f8cff]',
};

export default function Stat({
  label,
  value,
  hint,
  status = 'normal',
  mono = true,
  className = '',
}) {
  const valueColor = STATUS_VALUE_COLORS[status] || STATUS_VALUE_COLORS.normal;
  const valueFont = mono ? 'font-mono' : 'font-sans';

  return (
    <div
      className={`p-2.5 rounded-[6px] bg-wl-surface border border-wl-border flex flex-col justify-between min-w-0 ${className}`}
    >
      <span className="text-[11px] font-sans text-wl-muted truncate" title={label}>
        {label}
      </span>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`text-[16px] font-semibold leading-tight truncate ${valueFont} ${valueColor}`}
          title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
        >
          {value !== null && value !== undefined ? value : '—'}
        </span>
      </div>
      {hint && (
        <span className="text-[11px] font-sans text-wl-muted mt-0.5 truncate" title={hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

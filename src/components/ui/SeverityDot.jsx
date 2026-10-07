import React from 'react';

const SEVERITY_COLORS = {
  critical: 'bg-[#f85149]',
  high: 'bg-[#f85149]',
  medium: 'bg-[#d29922]',
  low: 'bg-[#7d8590]',
  passed: 'bg-[#3fb950]',
};

export default function SeverityDot({ severity = 'low', className = '', size = 'md' }) {
  const colorClass = SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;
  const sizeClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-block rounded-full shrink-0 ${sizeClass} ${colorClass} ${className}`}
      role="img"
      aria-label={`Severity: ${severity}`}
    />
  );
}

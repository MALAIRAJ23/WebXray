import React from 'react';

const VARIANT_STYLES = {
  critical: 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30',
  high: 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30',
  medium: 'bg-[#d29922]/10 text-[#d29922] border-[#d29922]/30',
  low: 'bg-[#7d8590]/15 text-[#7d8590] border-[#7d8590]/30',
  passed: 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/30',
  accent: 'bg-[#4f8cff]/10 text-[#4f8cff] border-[#4f8cff]/30',
  neutral: 'bg-wl-raised text-wl-muted border-wl-border',
};

export default function Badge({
  children,
  variant = 'neutral',
  className = '',
  mono = false,
}) {
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;
  const fontClass = mono ? 'font-mono' : 'font-sans';

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium leading-none rounded-[4px] border ${fontClass} ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}

import React from 'react';

const VARIANT_STYLES = {
  primary:
    'bg-[#4f8cff] hover:bg-[#3b7cf5] text-white border-transparent focus-visible:ring-[#4f8cff]',
  secondary:
    'bg-wl-surface hover:bg-wl-raised text-wl-text border-wl-border hover:border-wl-muted/40 focus-visible:ring-[#4f8cff]',
  ghost:
    'bg-transparent hover:bg-wl-surface text-wl-muted hover:text-wl-text border-transparent focus-visible:ring-[#4f8cff]',
  danger:
    'bg-[#f85149]/10 hover:bg-[#f85149]/20 text-[#f85149] border-[#f85149]/30 focus-visible:ring-[#f85149]',
};

const SIZE_STYLES = {
  sm: 'px-2 py-1 text-[11px] gap-1.5',
  md: 'px-3 py-1.5 text-[12px] gap-2',
};

export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.secondary;
  const sizeClass = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-sans font-medium rounded-[6px] border transition-colors duration-120 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-wl-bg disabled:opacity-50 disabled:pointer-events-none ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

import React from 'react';

const VARIANT_STYLES = {
  secondary:
    'bg-wl-surface hover:bg-wl-raised text-wl-muted hover:text-wl-text border-wl-border hover:border-wl-muted/40 focus-visible:ring-[#4f8cff]',
  ghost:
    'bg-transparent hover:bg-wl-surface text-wl-muted hover:text-wl-text border-transparent focus-visible:ring-[#4f8cff]',
  primary:
    'bg-[#4f8cff] hover:bg-[#3b7cf5] text-white border-transparent focus-visible:ring-[#4f8cff]',
};

const SIZE_STYLES = {
  sm: 'p-1',
  md: 'p-1.5',
};

export default function IconButton({
  icon: Icon,
  label,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  active = false,
  ...props
}) {
  const variantClass = active
    ? 'bg-wl-raised text-[#4f8cff] border-[#4f8cff]/50'
    : VARIANT_STYLES[variant] || VARIANT_STYLES.secondary;
  const sizeClass = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-[6px] border transition-colors duration-120 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-wl-bg disabled:opacity-50 disabled:pointer-events-none ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
    </button>
  );
}

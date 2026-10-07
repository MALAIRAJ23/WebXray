import React from 'react';

export default function Section({
  title,
  description,
  action,
  children,
  badge,
  className = '',
  divider = true,
}) {
  return (
    <section
      className={`${divider ? 'border-b border-wl-border pb-5 mb-5 last:border-b-0 last:pb-0 last:mb-0' : 'mb-4'} ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              {title && (
                <h2 className="text-[16px] font-semibold text-wl-text tracking-tight font-sans">
                  {title}
                </h2>
              )}
              {badge}
            </div>
            {description && (
              <p className="text-[11px] text-wl-muted mt-0.5 font-sans">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

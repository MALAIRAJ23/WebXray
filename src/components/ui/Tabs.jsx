import React, { useRef } from 'react';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  ariaLabel = 'Navigation tabs',
}) {
  const tabRefs = useRef([]);

  const handleKeyDown = (e, index) => {
    let nextIndex = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = tabs[nextIndex];
      if (nextTab && onChange) {
        onChange(nextTab.id);
        tabRefs.current[nextIndex]?.focus();
      }
    }
  };

  const getScoreColor = (score) => {
    if (typeof score !== 'number') return 'text-wl-muted';
    if (score >= 90) return 'text-[#3fb950]';
    if (score >= 70) return 'text-[#d29922]';
    return 'text-[#f85149]';
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-1 border-b border-wl-border overflow-x-auto no-scrollbar select-none ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        const scoreColor = getScoreColor(tab.score);

        return (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[idx] = el)}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative py-2 px-2.5 text-[12px] font-sans font-medium whitespace-nowrap transition-colors duration-120 border-b-2 -mb-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f8cff] ${
              isActive
                ? 'text-wl-text border-[#4f8cff]'
                : 'text-wl-muted hover:text-wl-text border-transparent'
            }`}
          >
            <span>{tab.label}</span>
            {tab.score !== undefined && tab.score !== null && (
              <span className={`ml-1.5 text-[11px] font-mono font-semibold ${scoreColor}`}>
                {tab.score}
              </span>
            )}
            {tab.count !== undefined && tab.count !== null && (
              <span className="ml-1.5 text-[11px] font-mono text-wl-muted">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

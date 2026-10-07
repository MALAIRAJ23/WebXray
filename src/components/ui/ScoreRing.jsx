import React from 'react';

const SIZE_MAP = {
  sm: { dimension: 36, stroke: 3, fontSize: 'text-[13px]', radius: 14 },
  md: { dimension: 48, stroke: 3.5, fontSize: 'text-[16px]', radius: 19 },
  lg: { dimension: 64, stroke: 4, fontSize: 'text-[22px]', radius: 26 },
  hero: { dimension: 80, stroke: 5, fontSize: 'text-[28px]', radius: 33 },
};

export default function ScoreRing({
  score,
  size = 'md',
  grade,
  label,
  className = '',
}) {
  const numScore = typeof score === 'number' && !isNaN(score) ? Math.round(score) : null;
  const config = SIZE_MAP[size] || SIZE_MAP.md;

  const color =
    numScore === null
      ? '#7d8590'
      : numScore >= 90
      ? '#3fb950'
      : numScore >= 70
      ? '#d29922'
      : '#f85149';

  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset =
    numScore !== null
      ? circumference - (circumference * Math.min(Math.max(numScore, 0), 100)) / 100
      : circumference;

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: config.dimension, height: config.dimension }}
      >
        <svg
          width={config.dimension}
          height={config.dimension}
          className="transform -rotate-90"
          aria-hidden="true"
        >
          {/* Background track circle */}
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={config.radius}
            stroke="#262d38"
            strokeWidth={config.stroke}
            fill="transparent"
          />
          {/* Progress circle */}
          {numScore !== null && (
            <circle
              cx={config.dimension / 2}
              cy={config.dimension / 2}
              r={config.radius}
              stroke={color}
              strokeWidth={config.stroke}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-120"
            />
          )}
        </svg>

        {/* Central score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.fontSize} font-bold font-sans text-wl-text leading-none`}>
            {numScore !== null ? numScore : '—'}
          </span>
          {grade && size === 'hero' && (
            <span className="text-[11px] font-mono text-wl-muted mt-0.5">
              Grade {grade}
            </span>
          )}
        </div>
      </div>

      {label && (
        <span className="text-[11px] font-sans text-wl-muted mt-1 truncate">
          {label}
        </span>
      )}
    </div>
  );
}

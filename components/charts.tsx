'use client';

export function MiniBarChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-36 items-end gap-2" aria-hidden="true">
      {values.map((value, index) => (
        <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-400/80 via-emerald-300/70 to-amber-300/80" style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

export function Ring({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - safeValue / 100);
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" role="img" aria-label={`${safeValue}%`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="12" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="url(#grad)" strokeWidth="12" strokeDasharray={c} strokeDashoffset={dash} strokeLinecap="round" />
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <text x="60" y="64" textAnchor="middle" fill="white" fontSize="20" fontWeight="700" transform="rotate(90 60 60)">{safeValue}%</text>
    </svg>
  );
}

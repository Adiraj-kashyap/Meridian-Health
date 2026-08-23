/** Single-stroke portal glyphs, same hand-drawn language as FeatureIcons —
 *  deliberately not literal stock icons (no generic person/briefcase clipart). */

const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconPatient({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <circle cx="14" cy="9" r="4.4" {...shared} />
      <path d="M5 24c0-5 4-8.5 9-8.5S23 19 23 24" {...shared} />
      <path d="M10.5 8.5 13 11l4-4.5" {...shared} strokeWidth={1.3} opacity={0.75} />
    </svg>
  );
}

export function IconDoctor({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <path d="M8 4v6c0 2.5 1.8 4 5 4s5-1.5 5-4V4" {...shared} />
      <path d="M13 14v4a5 5 0 0 0 5 5 4 4 0 0 0 4-4" {...shared} />
      <circle cx="22" cy="20" r="2.2" {...shared} />
    </svg>
  );
}

export function IconAdmin({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect x="4" y="6" width="20" height="16" rx="2.5" {...shared} />
      <path d="M4 11h20" {...shared} />
      <circle cx="10" cy="16" r="1.6" fill="currentColor" stroke="none" />
      <path d="M14 16h7" {...shared} strokeWidth={1.3} opacity={0.7} />
      <path d="M14 19h5" {...shared} strokeWidth={1.3} opacity={0.5} />
    </svg>
  );
}

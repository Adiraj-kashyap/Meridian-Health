/** Small single-stroke glyphs, hand-drawn in feel, matching the motif set
 *  used elsewhere (contour lines, botanical sprigs, node networks) so the
 *  feature grid doesn't fall back on a generic icon-font library. */

const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconNoDoubleBook({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect x="7" y="12" width="14" height="11" rx="2.5" {...shared} />
      <path d="M10 12V8.5a4 4 0 0 1 8 0V12" {...shared} />
      <path d="M11 21 17 15M17 21 11 15" {...shared} strokeWidth={1.3} opacity={0.7} />
    </svg>
  );
}

export function IconLeave({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect x="4" y="6" width="20" height="18" rx="2.5" {...shared} />
      <path d="M4 11h20" {...shared} />
      <path d="M9 4v4M19 4v4" {...shared} />
      <path d="M18 16c-3 0-3 3-6 3-1.7 0-2.8-.9-3.4-1.8" {...shared} strokeWidth={1.3} opacity={0.8} />
    </svg>
  );
}

export function IconGracefulAI({ className = "" }: { className?: string }) {
  const nodes: [number, number][] = [[7, 8], [19, 6], [22, 16], [12, 22], [5, 17]];
  const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2]];
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="currentColor" strokeWidth={0.9} opacity={0.55} />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 2.6 : 1.9} fill="currentColor" />
      ))}
    </svg>
  );
}

export function IconCalendarSync({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect x="4" y="7" width="16" height="16" rx="2.5" {...shared} />
      <path d="M4 12h16" {...shared} />
      <path d="M9 5v4M15 5v4" {...shared} />
      <path d="M20 18a5 5 0 0 0 4-4.9M24 9v4h-4" {...shared} strokeWidth={1.3} />
    </svg>
  );
}

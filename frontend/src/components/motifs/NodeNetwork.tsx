/** Connected-node motif for AI/analysis moments (pre-visit triage, post-visit
 *  summary) — a quiet nod to "the model is reasoning over this," rendered as
 *  line art rather than a literal robot/sparkle icon. */
export function NodeNetwork({ className = "" }: { className?: string }) {
  const nodes = [
    [20, 30], [70, 15], [110, 45], [150, 20], [40, 75], [95, 90], [140, 78], [175, 55],
  ];
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [6, 7], [2, 5], [1, 4], [3, 6],
  ];
  return (
    <svg className={className} viewBox="0 0 190 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.5"
        />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3.2 : 2} fill="currentColor" opacity="0.9" />
      ))}
    </svg>
  );
}

import { useEffect, useRef, useState } from "react";

/**
 * The hero's signature illustration: one continuous hand-drawn line that
 * starts as a vital-sign trace, resolves into a botanical vine, and ends in
 * a small data constellation — pulse -> growth -> intelligence, the same arc
 * as the product itself, drawn as a single stroke rather than three separate
 * decorations. Draws itself in once on mount, then holds (no looping motion
 * competing with the live demo card for attention).
 */
export function HeroSignature({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setActive(true), 150);
    return () => clearTimeout(t);
  }, []);

  const spine =
    "M0 250 H70 L88 250 L104 208 L122 302 L140 250 L168 250 L186 224 L204 250 H330 " +
    "C 400 250, 440 148, 520 160 S 632 262, 722 202 S 844 78, 946 112 S 1088 224, 1190 142 S 1330 56, 1400 92";

  const leaves: [number, number, number][] = [
    [452, 188, -22],
    [606, 188, 16],
    [766, 148, -26],
    [908, 140, 20],
    [1058, 162, -16],
    [1256, 108, 26],
  ];

  const nodes: [number, number][] = [
    [1330, 70],
    [1372, 108],
    [1388, 56],
    [1400, 132],
  ];
  const nodeEdges: [number, number][] = [[0, 1], [0, 2], [1, 3], [1, 2]];

  return (
    <svg
      ref={ref}
      viewBox="0 0 1400 340"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden="true"
    >
      <path
        d={spine}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: active ? 0 : 1,
          transition: "stroke-dashoffset 2.6s cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      {leaves.map(([x, y, rot], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="17"
          ry="7.5"
          stroke="currentColor"
          strokeWidth="1.2"
          transform={`rotate(${rot} ${x} ${y})`}
          style={{
            opacity: active ? 0.85 - i * 0.06 : 0,
            transform: active ? "scale(1)" : "scale(0.5)",
            transformOrigin: `${x}px ${y}px`,
            transition: `opacity 0.6s ease ${1.1 + i * 0.15}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${1.1 + i * 0.15}s`,
          }}
        />
      ))}

      {nodeEdges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          stroke="currentColor"
          strokeWidth="0.8"
          style={{
            opacity: active ? 0.5 : 0,
            transition: `opacity 0.6s ease ${2.1 + i * 0.08}s`,
          }}
        />
      ))}
      {nodes.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === 0 ? 3.4 : 2.4}
          fill="currentColor"
          className={active ? "animate-pulse-soft" : ""}
          style={{
            opacity: active ? 1 : 0,
            transition: `opacity 0.5s ease ${2.2 + i * 0.1}s`,
          }}
        />
      ))}
    </svg>
  );
}

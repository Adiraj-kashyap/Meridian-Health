import { useEffect, useRef, useState } from "react";

/**
 * A gently wavy line stitching together N nodes, drawn in on scroll — the
 * literal "one thread, four moments" from the how-it-works copy. Structural
 * decoration that encodes the section's actual claim, not a generic divider.
 */
export function ThreadLine({ className = "", nodeCount = 4 }: { className?: string; nodeCount?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const positions = Array.from({ length: nodeCount }, (_, i) => 40 + i * (920 / (nodeCount - 1)));
  const d =
    `M ${positions[0]} 20 ` +
    positions
      .slice(1)
      .map((x, i) => `Q ${(positions[i] + x) / 2} ${i % 2 === 0 ? 4 : 36} ${x} 20`)
      .join(" ");

  return (
    <svg ref={ref} viewBox="0 0 1000 40" fill="none" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: active ? 0 : 1,
          transition: "stroke-dashoffset 1.7s cubic-bezier(0.16,1,0.3,1)",
        }}
      />
      {positions.map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={20}
          r="4.5"
          fill="currentColor"
          style={{
            opacity: active ? 1 : 0,
            transform: active ? "scale(1)" : "scale(0.4)",
            transformOrigin: `${x}px 20px`,
            transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.28}s, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.28}s`,
          }}
        />
      ))}
    </svg>
  );
}

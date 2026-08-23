/** A single-line botanical sprig, hand-drawn in feel. Anchors corners and
 *  section breaks so the clinical UI reads as caring rather than sterile —
 *  the organic counterweight to the mono/data-label typography. */
export function BotanicalCorner({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M10 190 C 40 150, 30 100, 60 60 C 80 34, 110 20, 150 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {[
        [55, 95, 30],
        [75, 70, -18],
        [95, 48, 26],
        [118, 30, -14],
      ].map(([x, y, rot], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="16"
          ry="7"
          stroke="currentColor"
          strokeWidth="1.4"
          transform={`rotate(${rot} ${x} ${y})`}
          opacity={0.85 - i * 0.1}
        />
      ))}
    </svg>
  );
}

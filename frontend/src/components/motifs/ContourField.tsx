/**
 * Topographic-map style contour lines — evokes both "vital sign trace" and
 * "natural landscape," which is the whole visual thesis of this app: a
 * clinical product that treats care as something organic, not sterile.
 * Pure inline SVG, no raster assets, so it stays crisp and file-light.
 */
export function ContourField({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const y = 60 + i * 85;
        const wobble = 40 + (i % 3) * 18;
        return (
          <path
            key={i}
            d={`M -50 ${y} C 150 ${y - wobble}, 300 ${y + wobble}, 480 ${y} S 820 ${y - wobble}, 1000 ${y} S 1250 ${y + wobble * 0.6}, 1300 ${y}`}
            stroke="currentColor"
            strokeWidth={i % 3 === 0 ? 1.4 : 0.8}
            opacity={0.5 - i * 0.03}
          />
        );
      })}
    </svg>
  );
}

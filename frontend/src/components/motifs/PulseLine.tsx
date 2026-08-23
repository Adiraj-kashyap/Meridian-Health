/** An ECG-style trace that draws itself in on mount. Used sparingly as the
 *  hero's signature element — the "most characteristic thing" in a clinical
 *  product's world is the vital-sign line, so it earns the spotlight once. */
export function PulseLine({ className = "" }: { className?: string }) {
  const d = "M0 40 H120 L145 40 L160 8 L182 76 L204 40 L230 40 L250 20 L268 40 H420 L440 40 L462 12 L484 68 L505 40 L560 40";
  return (
    <svg className={className} viewBox="0 0 560 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: "trace 2.4s cubic-bezier(0.65,0,0.35,1) 0.3s forwards",
        }}
      />
      <style>{`@keyframes trace { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}

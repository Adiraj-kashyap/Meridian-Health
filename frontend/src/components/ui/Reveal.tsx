import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Scroll-triggered entrance, one IntersectionObserver per instance. Deliberately
 * not a blanket "fade-up everything" utility — pass `delay` to stagger a group
 * so the reveal reads as choreographed rather than uniform AOS-style motion.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={clsx(className, visible ? "animate-rise-in" : "opacity-0")}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

import { Link } from "react-router-dom";
import { buttonClasses } from "../components/ui/Button";
import { ContourField } from "../components/motifs/ContourField";
import { BotanicalCorner } from "../components/motifs/BotanicalCorner";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[calc(100vh-4.5rem)] items-center justify-center overflow-hidden bg-paper-grain px-6 py-20 text-center">
      <ContourField className="pointer-events-none absolute inset-0 h-full w-full text-pine-700/[0.06]" />
      <BotanicalCorner flip className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 text-terracotta-500/15 animate-drift" />

      <div className="relative">
        <span className="font-mono text-xs uppercase tracking-wider text-terracotta-800">Page not found</span>
        <h1 className="mt-3 font-display text-7xl font-semibold italic text-pine-700 md:text-8xl">404</h1>
        <p className="mx-auto mt-4 max-w-sm text-ink-soft">
          This slot isn't held for anything — the page you're looking for either moved or never existed.
        </p>
        <Link to="/" className={`${buttonClasses("primary", "lg", "group")} mt-8`}>
          Back to Meridian Health
          <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </div>
  );
}

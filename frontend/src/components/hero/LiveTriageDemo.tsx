import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NodeNetwork } from "../motifs/NodeNetwork";

interface Example {
  symptoms: string;
  urgency: "Low" | "Medium" | "High";
  complaint: string;
  questions: [string, string, string];
}

const EXAMPLES: Example[] = [
  {
    symptoms: "Persistent cough, 6 days, mild fever.",
    urgency: "Medium",
    complaint: "Possible lower respiratory infection",
    questions: [
      "Any shortness of breath at rest?",
      "Fever pattern — constant or spiking?",
      "Recent exposure to respiratory illness?",
    ],
  },
  {
    symptoms: "Sharp chest pain when breathing in.",
    urgency: "High",
    complaint: "Possible pleuritic chest involvement",
    questions: [
      "Does the pain radiate to your arm or jaw?",
      "Any recent injury or prolonged bed rest?",
      "Worse lying down, or with movement?",
    ],
  },
  {
    symptoms: "Mild headache, worse in the afternoon.",
    urgency: "Low",
    complaint: "Likely tension-type headache",
    questions: [
      "How many hours of screen time daily?",
      "Any change in sleep or hydration lately?",
      "Does rest or dark rooms help?",
    ],
  },
];

type Phase = "type" | "analyze" | "result";
const DURATIONS: Record<Phase, number> = { type: 1700, analyze: 1200, result: 3800 };
const NEXT: Record<Phase, Phase> = { type: "analyze", analyze: "result", result: "type" };

const urgencyClasses: Record<Example["urgency"], string> = {
  Low: "border-sage-100/40 bg-sage-100/10 text-sage-100",
  Medium: "border-gold-400/50 bg-gold-400/15 text-gold-400",
  High: "border-terracotta-300/60 bg-terracotta-300/15 text-terracotta-300",
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * The hero's live centerpiece: a self-playing loop through the product's
 * actual pre-visit flow (type symptoms -> AI analyzes -> triage resolves),
 * cycling between a few real examples. Demonstrates the feature instead of
 * captioning a static screenshot of it. Freezes on a fully-resolved result
 * with no animation when the OS asks for reduced motion.
 */
export function LiveTriageDemo() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("type");
  const [typed, setTyped] = useState("");
  const typeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const example = EXAMPLES[index];

  useEffect(() => {
    if (reduced) return;
    if (typeTimer.current) clearInterval(typeTimer.current);
    if (phase !== "type") return;

    setTyped("");
    const text = EXAMPLES[index].symptoms;
    let i = 0;
    const stepMs = Math.max(28, DURATIONS.type / text.length);
    typeTimer.current = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length && typeTimer.current) {
        clearInterval(typeTimer.current);
      }
    }, stepMs);
    return () => {
      if (typeTimer.current) clearInterval(typeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, reduced]);

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => {
      setPhase((p) => NEXT[p]);
      if (phase === "result") setIndex((i) => (i + 1) % EXAMPLES.length);
    }, DURATIONS[phase]);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  if (reduced) {
    const e = EXAMPLES[0];
    return (
      <div className="min-h-[13rem]">
        <p className="font-display text-2xl leading-snug">&ldquo;{e.symptoms}&rdquo;</p>
        <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs uppercase tracking-wider ${urgencyClasses[e.urgency]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" /> {e.urgency} urgency
        </span>
        <p className="mt-3 font-display text-lg leading-snug">{e.complaint}</p>
        <ul className="mt-4 space-y-2 border-t border-paper/15 pt-4 text-sm text-sage-200">
          {e.questions.map((q) => <li key={q}>· {q}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <motion.div layout transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="min-h-[13rem]">
      <AnimatePresence mode="wait">
        {phase === "type" && (
          <motion.div key="type" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <p className="min-h-[4rem] font-display text-2xl leading-snug">
              &ldquo;{typed}
              <motion.span
                aria-hidden="true"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                className="ml-0.5 inline-block h-6 w-[2px] translate-y-1 bg-gold-400 align-middle"
              />
              &rdquo;
            </p>
          </motion.div>
        )}

        {phase === "analyze" && (
          <motion.div key="analyze" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="flex items-center gap-3 py-6">
            <NodeNetwork className="h-10 w-14 text-gold-400 animate-pulse-soft" />
            <p className="font-mono text-xs uppercase tracking-wider text-sage-200">Analyzing symptoms…</p>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs uppercase tracking-wider ${urgencyClasses[example.urgency]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" /> {example.urgency} urgency
            </motion.span>
            <p className="mt-3 font-display text-lg leading-snug">{example.complaint}</p>
            <ul className="mt-4 space-y-2 border-t border-paper/15 pt-4 text-sm text-sage-200">
              {example.questions.map((q, i) => (
                <motion.li key={q} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 * i + 0.15, duration: 0.4 }}>
                  · {q}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

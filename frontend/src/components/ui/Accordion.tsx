import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface AccordionItemProps {
  question: string;
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionItem({ question, children, isOpen, onToggle }: AccordionItemProps) {
  return (
    <div className="border-b border-ink/10 py-5">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
      >
        <span className="font-display text-lg text-ink md:text-xl">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-pine-700/25 font-mono text-lg text-pine-700"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pt-3 leading-relaxed text-ink-soft">{children}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Single-open accordion. Deliberately not a details/summary native element —
 *  the height animation is the whole point (a "designer would nod" detail
 *  a plain browser disclosure widget can't give you). */
export function Accordion({ items, className = "" }: { items: { question: string; answer: ReactNode }[]; className?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className={clsx("border-t border-ink/10", className)}>
      {items.map((item, i) => (
        <AccordionItem
          key={item.question}
          question={item.question}
          isOpen={openIndex === i}
          onToggle={() => setOpenIndex((current) => (current === i ? null : i))}
        >
          {item.answer}
        </AccordionItem>
      ))}
    </div>
  );
}

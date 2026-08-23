import { useRef, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform, useScroll, useReducedMotion } from "framer-motion";
import { ContourField } from "../components/motifs/ContourField";
import { PulseLine } from "../components/motifs/PulseLine";
import { BotanicalCorner } from "../components/motifs/BotanicalCorner";
import { HeroSignature } from "../components/motifs/HeroSignature";
import { ThreadLine } from "../components/motifs/ThreadLine";
import { IconNoDoubleBook, IconLeave, IconGracefulAI, IconCalendarSync } from "../components/motifs/FeatureIcons";
import { IconPatient, IconDoctor, IconAdmin } from "../components/motifs/PortalIcons";
import { buttonClasses } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Reveal } from "../components/ui/Reveal";
import { Accordion } from "../components/ui/Accordion";
import { LiveTriageDemo } from "../components/hero/LiveTriageDemo";

const steps = [
  {
    n: "01",
    title: "Tell us what's going on",
    body: "Search by specialization, pick a slot, and describe your symptoms before you even leave the house.",
  },
  {
    n: "02",
    title: "Your doctor arrives briefed",
    body: "An AI pre-visit summary flags urgency and drafts questions, so the first five minutes aren't spent repeating yourself.",
  },
  {
    n: "03",
    title: "Leave with a plan you understand",
    body: "Clinical notes become a plain-language summary — medication schedule, follow-up steps, no jargon.",
  },
  {
    n: "04",
    title: "We keep track so you don't have to",
    body: "Dose reminders, calendar events, and confirmations land in your inbox automatically.",
  },
];

const portals = [
  {
    role: "PATIENT",
    Icon: IconPatient,
    title: "Book, describe, and know before you go.",
    body: "Search by specialization, hold a slot, and describe what's wrong before you leave the house.",
    bullets: ["Search by specialization", "AI pre-visit triage", "Medication reminders by email"],
  },
  {
    role: "DOCTOR",
    Icon: IconDoctor,
    title: "Walk in already briefed.",
    body: "An AI-drafted urgency read and suggested questions are waiting before the patient sits down.",
    bullets: ["Urgency level & chief complaint", "One-click patient-friendly summary", "Calendar synced both ways"],
  },
  {
    role: "ADMIN",
    Icon: IconAdmin,
    title: "Run the schedule, not chase it.",
    body: "Doctor profiles, working hours, and leave — with affected patients notified the moment something changes.",
    bullets: ["Doctor onboarding & hours", "Leave-aware auto-cancellation", "Clinic-wide oversight"],
  },
];

const faqs = [
  {
    question: "What happens if the AI can't generate a summary?",
    answer:
      "Nothing breaks. Your symptoms or clinical notes are saved regardless — if the AI is briefly unavailable, your doctor sees your raw notes instead of a summary, and either of you can retry it anytime from the appointment page.",
  },
  {
    question: "Can two people book the same slot by accident?",
    answer:
      "No. The moment you pick a time it's held for you alone while you fill in your symptoms, and the database itself refuses a second booking for that doctor and time — even if two people click at the exact same second.",
  },
  {
    question: "What if my doctor goes on leave after I've already booked?",
    answer:
      "You're notified by email the moment it happens, and the appointment is cancelled automatically so you're not left waiting on a day the clinic isn't seeing patients.",
  },
  {
    question: "Do I have to reconnect my calendar every time?",
    answer:
      "Connect it once from Settings. After that, confirmed appointments appear on your Google Calendar automatically, move if you reschedule, and disappear if you cancel.",
  },
  {
    question: "How are medication reminders scheduled?",
    answer:
      "Straight from your doctor's prescription — the frequency and duration they enter translate directly into reminder emails timed across each day of your course.",
  },
];

const features = [
  { title: "No double-booking, ever", body: "Slot holds and database-level locking make race conditions structurally impossible, not just unlikely.", Icon: IconNoDoubleBook },
  { title: "Leave-aware scheduling", body: "When a doctor goes on leave, every affected patient is notified automatically — nobody shows up to a closed door.", Icon: IconLeave },
  { title: "Graceful AI, not fragile AI", body: "If the LLM is unavailable, your raw notes are always there. Summaries enhance the record; they never gate it.", Icon: IconGracefulAI },
  { title: "Calendar-synced both ways", body: "Google Calendar events for patient and doctor update themselves on reschedule and disappear on cancellation.", Icon: IconCalendarSync },
];

export default function Landing() {
  const heroRef = useRef<HTMLElement>(null);

  // ─── Motion variant B: "bold" — scroll-linked + mouse-tracking parallax ───
  // Variant A ("restrained") is preserved as a commented-out block just below
  // in the JSX, plus the flat/static className props it used — swap back by
  // uncommenting that block and removing the motion.div wrappers below it.
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 90]);
  const bgOpacity = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [1, 1] : [1, 0.25]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smoothMx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.4 });
  const smoothMy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.4 });
  const parallaxRange = prefersReducedMotion ? 0 : 1;
  const signatureX = useTransform(smoothMx, [-0.5, 0.5], [-16 * parallaxRange, 16 * parallaxRange]);
  const signatureY = useTransform(smoothMy, [-0.5, 0.5], [-10 * parallaxRange, 10 * parallaxRange]);
  const cornerX = useTransform(smoothMx, [-0.5, 0.5], [10 * parallaxRange, -10 * parallaxRange]);
  const cornerY = useTransform(smoothMy, [-0.5, 0.5], [8 * parallaxRange, -8 * parallaxRange]);
  const cardRotateX = useTransform(smoothMy, [-0.5, 0.5], [6 * parallaxRange, -6 * parallaxRange]);
  const cardRotateY = useTransform(smoothMx, [-0.5, 0.5], [-6 * parallaxRange, 6 * parallaxRange]);

  function handleHeroMouseMove(e: MouseEvent<HTMLElement>) {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function resetHeroMouse() {
    mx.set(0);
    my.set(0);
  }
  // ─── end variant B setup ───────────────────────────────────────────────

  return (
    <div className="overflow-x-clip">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={resetHeroMouse}
        className="relative isolate flex min-h-[calc(100vh-4.5rem)] items-center overflow-hidden border-b border-ink/8 py-14 md:py-16"
      >
        <div className="absolute inset-0 -z-20 bg-paper-grain" />

        {/* Variant A "restrained" (static layers, no parallax) — kept for comparison:
        <ContourField className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-pine-700/[0.07]" />
        <BotanicalCorner className="pointer-events-none absolute -left-6 -top-6 h-48 w-48 text-pine-700/20 animate-drift md:h-60 md:w-60" />
        <HeroSignature className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-pine-700/[0.14] md:h-56" />
        */}

        {/* Variant B "bold" (active): background drifts+fades on scroll, drifts with the cursor */}
        <motion.div style={{ y: bgY, opacity: bgOpacity }} className="pointer-events-none absolute inset-0 -z-10">
          <ContourField className="h-full w-full text-pine-700/[0.07]" />
        </motion.div>
        <motion.div style={{ x: cornerX, y: cornerY }} className="pointer-events-none absolute -left-6 -top-6 h-48 w-48 md:h-60 md:w-60">
          <BotanicalCorner className="h-full w-full text-pine-700/20" />
        </motion.div>
        <motion.div style={{ x: signatureX, y: signatureY, opacity: bgOpacity }} className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full md:h-56">
          <HeroSignature className="h-full w-full text-pine-700/[0.14]" />
        </motion.div>

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <div>
            <span
              className="animate-rise-in inline-flex items-center gap-2 rounded-full border border-pine-700/25 bg-sage-100 px-3 py-1 font-mono text-xs uppercase tracking-wider text-pine-700"
              style={{ animationDelay: "0ms" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-terracotta-500" />
              For patients, doctors, and the clinics between them
            </span>

            <h1
              className="animate-rise-in mt-5 text-balance font-display text-5xl font-semibold leading-[1.04] tracking-tight text-ink md:text-6xl lg:text-7xl"
              style={{ animationDelay: "90ms" }}
            >
              Care that remembers <span className="italic text-pine-700">everything</span>,
              <br className="hidden md:block" /> so people don't have to.
            </h1>

            <p className="animate-rise-in mt-5 max-w-lg text-lg leading-relaxed text-ink-soft" style={{ animationDelay: "180ms" }}>
              Book in a minute, share symptoms in advance, and walk into every visit already
              understood. Meridian pairs a clinic's real schedule with AI-assisted summaries —
              before and after every appointment.
            </p>

            <div className="animate-rise-in mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: "270ms" }}>
              <Link to="/register" className={buttonClasses("primary", "lg", "group")}>
                Book your first visit
                <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">→</span>
              </Link>
              <Link
                to="/register?role=DOCTOR"
                className="font-mono text-sm uppercase tracking-wide text-ink-soft underline decoration-terracotta-500 decoration-2 underline-offset-4 hover:text-pine-700"
              >
                I'm a clinician →
              </Link>
            </div>

            <div className="animate-rise-in mt-8 flex items-center gap-6 text-ink-soft" style={{ animationDelay: "360ms" }}>
              <PulseLine className="h-9 w-36 text-terracotta-500" />
              <p className="font-mono text-xs uppercase tracking-wider">Live triage, before you arrive</p>
            </div>
          </div>

          <div className="animate-rise-in relative" style={{ animationDelay: "220ms" }}>
            {/* Variant A "restrained" card (no tilt) — kept for comparison:
            <Card className="relative overflow-hidden bg-pine-700 p-6 pb-10 text-paper shadow-lift md:p-7 md:pb-12">
              <p className="font-mono text-xs uppercase tracking-wider text-sage-200">AI pre-visit summary</p>
              <div className="mt-3">
                <LiveTriageDemo />
              </div>
            </Card>
            */}

            {/* Variant B "bold" (active): subtle 3D tilt toward the cursor.
                pb-10/pb-12 is a modest bump over the card's normal p-6/p-7
                bottom padding — just enough reserved clearance that the
                "Reminder sent" note below can't sit on top of the last line
                of result-phase text. (An earlier pb-20/pb-24 pass over-fixed
                this and made the hero taller than the viewport again — kept
                small this time on purpose.) */}
            <motion.div style={{ rotateX: cardRotateX, rotateY: cardRotateY, transformPerspective: 900 }}>
              <Card className="relative overflow-hidden bg-pine-700 p-6 pb-10 text-paper shadow-lift md:p-7 md:pb-12">
                <p className="font-mono text-xs uppercase tracking-wider text-sage-200">AI pre-visit summary</p>
                <div className="mt-3">
                  <LiveTriageDemo />
                </div>
              </Card>
            </motion.div>

            <Card className="absolute -bottom-8 -left-6 hidden w-48 -rotate-3 bg-parchment-deep p-4 shadow-lift lg:block">
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-ink-soft">Reminder sent</p>
              <p className="mt-1 font-display text-sm text-ink">Take Amoxicillin — 8:00 AM</p>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative overflow-hidden border-b border-ink/8 bg-parchment-deep">
        <ContourField className="pointer-events-none absolute -right-40 top-0 h-full w-[150%] rotate-6 text-terracotta-500/[0.05]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">One thread, four moments.</h2>
            <p className="mt-3 max-w-xl text-ink-soft">From the first symptom to the last dose reminder, nothing gets re-typed or forgotten.</p>
          </Reveal>

          <div className="relative mt-16">
            <ThreadLine className="pointer-events-none absolute -top-8 left-0 hidden h-8 w-full text-terracotta-500/40 lg:block" />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <Reveal key={s.n} delay={i * 110}>
                  <div className="group border-t-2 border-terracotta-500/30 pt-4 transition-colors duration-500 hover:border-terracotta-500">
                    <span className="font-display text-3xl italic text-terracotta-500 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5">
                      {s.n}
                    </span>
                    <h3 className="mt-3 font-display text-xl font-semibold text-ink">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Three portals ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-ink/8">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">One system, three very different days.</h2>
            <p className="mt-3 max-w-xl text-ink-soft">Same schedule, same records — a different job for whoever's looking at them.</p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {portals.map((p, i) => (
              <Reveal key={p.role} delay={i * 110}>
                <Card className="group h-full p-7 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-pine-700/25 hover:shadow-lift">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage-100 text-pine-700 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110">
                      <p.Icon className="h-6 w-6" />
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wider text-terracotta-800">{p.role}</span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-ink">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.body}</p>
                  <ul className="mt-5 space-y-2 border-t border-ink/10 pt-5">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 font-mono text-xs text-ink-soft">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-terracotta-500" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features / reliability ───────────────────────────────────── */}
      <section id="for-clinics" className="relative overflow-hidden border-b border-ink/8">
        <span className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 -rotate-90 font-mono text-[0.65rem] uppercase tracking-[0.35em] text-ink-soft/25 lg:block">
          Reliability notes
        </span>
        <BotanicalCorner flip className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 text-pine-700/[0.05]" />

        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">Built for the messy parts.</h2>
              <p className="max-w-sm text-sm text-ink-soft">
                The parts every clinic app promises and few actually get right: concurrency, leave, and failure modes.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <Card className="group h-full p-6 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-pine-700/25 hover:shadow-lift">
                  <f.Icon className="h-7 w-7 text-terracotta-500 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-3" />
                  <h3 className="mt-4 font-display text-lg font-semibold text-pine-700">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-ink/8 bg-parchment-deep">
        <BotanicalCorner className="pointer-events-none absolute -left-14 -bottom-14 h-64 w-64 text-terracotta-500/[0.06]" />
        <div className="relative mx-auto max-w-3xl px-6 py-20">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">Questions worth asking before you trust a clinic app.</h2>
            <p className="mt-3 text-ink-soft">Not the marketing kind — the kind about what actually happens when something goes wrong.</p>
          </Reveal>

          <Reveal delay={120} className="mt-10">
            <Accordion items={faqs} />
          </Reveal>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-pine-900 text-paper">
        <ContourField className="pointer-events-none absolute inset-0 h-full w-full text-paper/10" />
        <BotanicalCorner className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 text-gold-400/10 animate-drift" />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <Reveal>
            <h2 className="text-balance font-display text-4xl font-semibold leading-tight md:text-5xl">
              Your next appointment could already know why you're coming in.
            </h2>
            <div className="mt-8 flex justify-center gap-4">
              <Link to="/register" className={buttonClasses("secondary", "lg", "group")}>
                Create your account
                <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-ink/8 bg-parchment px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 font-mono text-xs uppercase tracking-wider text-ink-soft md:flex-row">
          <span>Meridian Health — Appointment & Follow-up Manager</span>
          <span>Built for the clinic round-trip: booking → triage → visit → recovery.</span>
        </div>
      </footer>
    </div>
  );
}

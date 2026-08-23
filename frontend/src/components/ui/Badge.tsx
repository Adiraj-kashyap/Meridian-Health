import clsx from "clsx";
import type { AppointmentStatus, Urgency } from "../../types/api";

const urgencyClasses: Record<Urgency, string> = {
  LOW: "bg-sage-100 text-pine-700 border-pine-700/20",
  MEDIUM: "bg-gold-200 text-terracotta-800 border-terracotta-500/30",
  HIGH: "bg-clay-400/10 text-clay-600 border-clay-400/40",
};

export function UrgencyBadge({ level }: { level: Urgency }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs uppercase tracking-wider",
        urgencyClasses[level]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level} urgency
    </span>
  );
}

const statusClasses: Record<AppointmentStatus, string> = {
  HELD: "bg-gold-200 text-terracotta-800",
  CONFIRMED: "bg-sage-100 text-pine-700",
  CANCELLED: "bg-ink/8 text-ink-soft",
  COMPLETED: "bg-pine-700 text-paper",
  NO_SHOW: "bg-clay-400/10 text-clay-600",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 font-mono text-xs uppercase tracking-wider", statusClasses[status])}>
      {status.replace("_", " ")}
    </span>
  );
}

import clsx from "clsx";

/** Base shimmer block. Prefer the shaped compositions below over using this
 *  directly — a skeleton that mirrors the real layout reads as "the page is
 *  loading" where a generic spinner just reads as "wait." */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={clsx("skeleton rounded-lg", className)} />;
}

export function SkeletonText({ className = "", width = "100%" }: { className?: string; width?: string }) {
  return <div className={clsx("skeleton h-3.5 rounded", className)} style={{ width }} />;
}

export function DoctorCardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink/8 bg-paper p-6 shadow-soft">
      <SkeletonText width="35%" className="h-3" />
      <SkeletonText width="65%" className="mt-3 h-5" />
      <SkeletonText width="90%" className="mt-3" />
      <SkeletonText width="70%" className="mt-1.5" />
      <SkeletonText width="45%" className="mt-4 h-3" />
    </div>
  );
}

export function DoctorGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <DoctorCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AppointmentRowSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink/8 bg-paper p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <SkeletonText width="45%" className="h-4.5" />
        <SkeletonText width="30%" className="mt-2 h-3" />
      </div>
      <SkeletonBlock className="h-6 w-24" />
    </div>
  );
}

export function AppointmentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <AppointmentRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function SlotGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} className="h-10" />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink/8 bg-paper p-5 shadow-soft">
      <SkeletonText width="40%" className="h-8" />
      <SkeletonText width="70%" className="mt-2 h-3" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div>
      <SkeletonText width="25%" className="h-3" />
      <SkeletonText width="45%" className="mt-2 h-8" />
      <SkeletonText width="90%" className="mt-4" />
      <SkeletonBlock className="mt-8 h-40 w-full" />
    </div>
  );
}

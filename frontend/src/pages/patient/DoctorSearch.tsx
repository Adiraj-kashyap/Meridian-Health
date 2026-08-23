import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, extractErrorMessage } from "../../lib/api";
import type { DoctorProfile } from "../../types/api";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Field";
import { DoctorGridSkeleton } from "../../components/ui/Skeleton";
import { Reveal } from "../../components/ui/Reveal";
import { ContourField } from "../../components/motifs/ContourField";

export default function DoctorSearch() {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .get<DoctorProfile[]>("/doctors", { params: query ? { specialization: query } : {}, signal: controller.signal })
      .then((res) => setDoctors(res.data))
      .catch((err) => {
        if (!controller.signal.aborted) setError(extractErrorMessage(err));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query]);

  return (
    <div className="relative">
      <ContourField className="pointer-events-none absolute inset-x-0 top-0 h-64 w-full text-pine-700/[0.05]" />
      <div className="relative mx-auto max-w-5xl px-6 py-14">
        <span className="font-mono text-xs uppercase tracking-wider text-terracotta-800">Find care</span>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Search doctors by specialization</h1>

        <Input
          className="mt-6 max-w-md"
          placeholder="e.g. Cardiology, General Medicine…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {loading && <div className="mt-10"><DoctorGridSkeleton /></div>}
        {error && <p className="mt-6 text-clay-600">{error}</p>}

        {!loading && !error && (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.length === 0 && <p className="text-ink-soft">No doctors match that search yet.</p>}
            {doctors.map((d, i) => (
              <Reveal key={d.id} delay={Math.min(i, 5) * 70}>
                <Link to={`/app/doctors/${d.id}`}>
                  <Card className="h-full p-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-pine-700/25 hover:shadow-lift">
                    <p className="font-mono text-xs uppercase tracking-wider text-terracotta-800">{d.specialization}</p>
                    <h2 className="mt-2 font-display text-xl font-semibold text-ink">Dr. {d.user.name}</h2>
                    <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{d.bio ?? "Experienced clinician ready to help."}</p>
                    <p className="mt-4 font-mono text-xs text-ink-soft">{d.slotDurationMinutes}-min visits{d.consultationFee ? ` · $${d.consultationFee}` : ""}</p>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

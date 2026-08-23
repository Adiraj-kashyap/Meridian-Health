import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Appointment } from "../types/api";
import { Card } from "../components/ui/Card";
import { StatusBadge, UrgencyBadge } from "../components/ui/Badge";
import { AppointmentListSkeleton } from "../components/ui/Skeleton";
import { Reveal } from "../components/ui/Reveal";

export default function AppointmentList() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Appointment[]>("/appointments/me")
      .then((res) => setAppointments(res.data))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <span className="font-mono text-xs uppercase tracking-wider text-terracotta-800">
        {user?.role === "DOCTOR" ? "Your schedule" : "Your care"}
      </span>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Appointments</h1>

      {error && <p className="mt-6 text-clay-600">{error}</p>}
      {!loading && !error && appointments.length === 0 && <p className="mt-8 text-ink-soft">No appointments yet.</p>}

      {loading ? (
        <div className="mt-8">
          <AppointmentListSkeleton />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {appointments.map((a, i) => (
            <Reveal key={a.id} delay={Math.min(i, 6) * 60}>
              <Link to={`/app/appointments/${a.id}`}>
                <Card className="flex flex-col gap-3 p-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-pine-700/25 hover:shadow-lift sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">
                      {user?.role === "DOCTOR" ? a.patient.user.name : `Dr. ${a.doctor.user.name}`}
                      {user?.role !== "DOCTOR" && <span className="ml-2 font-mono text-xs font-normal text-ink-soft">{a.doctor.specialization}</span>}
                    </p>
                    <p className="mt-1 font-mono text-sm text-ink-soft">{format(new Date(a.slotStart), "EEE, MMM d 'at' h:mm a")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.symptomForm?.urgencyLevel && <UrgencyBadge level={a.symptomForm.urgencyLevel} />}
                    <StatusBadge status={a.status} />
                  </div>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

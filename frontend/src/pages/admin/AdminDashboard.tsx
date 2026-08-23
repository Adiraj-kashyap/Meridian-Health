import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, extractErrorMessage } from "../../lib/api";
import type { DoctorProfile } from "../../types/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Label, Textarea, FieldError } from "../../components/ui/Field";
import { StatGridSkeleton, SkeletonText } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

interface Stats { doctors: number; patients: number; appointments: number; pendingNotifications: number }

const emptyForm = { email: "", name: "", specialization: "", bio: "", slotDurationMinutes: 30, consultationFee: "" };

export default function AdminDashboard() {
  const { push } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh() {
    return Promise.all([
      api.get<Stats>("/admin/stats").then((r) => setStats(r.data)),
      api.get<DoctorProfile[]>("/doctors").then((r) => setDoctors(r.data)),
    ]);
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function createDoctor(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post("/admin/doctors", {
        ...form,
        slotDurationMinutes: Number(form.slotDurationMinutes),
        consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
      });
      push(`Doctor account created. Temp password: ${data.tempPassword}`, "success");
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <span className="font-mono text-xs uppercase tracking-wider text-terracotta-800">Clinic administration</span>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Admin overview</h1>

      <div className="mt-8">
        {loading ? (
          <StatGridSkeleton />
        ) : (
          stats && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ["Doctors", stats.doctors],
                ["Patients", stats.patients],
                ["Appointments", stats.appointments],
                ["Notifications pending", stats.pendingNotifications],
              ].map(([label, value]) => (
                <Card key={label as string} className="p-5">
                  <p className="font-display text-3xl font-semibold text-pine-700">{value}</p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-wider text-ink-soft">{label}</p>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold text-ink">Add a doctor</h2>
          <form onSubmit={createDoctor} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="d-name">Full name</Label>
              <Input id="d-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="d-email">Email</Label>
              <Input id="d-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="d-spec">Specialization</Label>
              <Input id="d-spec" required value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="d-bio">Bio</Label>
              <Textarea id="d-bio" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="d-slot">Slot duration (min)</Label>
                <Input id="d-slot" type="number" min={5} max={180} value={form.slotDurationMinutes} onChange={(e) => setForm((f) => ({ ...f, slotDurationMinutes: Number(e.target.value) }))} />
              </div>
              <div>
                <Label htmlFor="d-fee">Fee (optional)</Label>
                <Input id="d-fee" type="number" min={0} value={form.consultationFee} onChange={(e) => setForm((f) => ({ ...f, consultationFee: e.target.value }))} />
              </div>
            </div>
            <FieldError>{error}</FieldError>
            <Button type="submit" loading={busy} className="w-full">Create doctor account</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold text-ink">Doctors</h2>
          <div className="mt-4 space-y-3">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-ink/10 px-4 py-3">
                  <SkeletonText width="40%" className="h-4" />
                  <SkeletonText width="25%" className="mt-2 h-3" />
                </div>
              ))}
            {!loading &&
              doctors.map((d) => (
                <Link key={d.id} to={`/app/admin/doctors/${d.id}`}>
                  <div className="flex items-center justify-between rounded-lg border border-ink/10 px-4 py-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-pine-700/40 hover:bg-sage-100 hover:shadow-soft">
                    <div>
                      <p className="font-medium text-ink">Dr. {d.user.name}</p>
                      <p className="font-mono text-xs text-ink-soft">{d.specialization}</p>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-wider text-pine-700">Manage →</span>
                  </div>
                </Link>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { api, extractErrorMessage } from "../../lib/api";
import type { DoctorProfile } from "../../types/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Label, FieldError } from "../../components/ui/Field";
import { DetailPageSkeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminDoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const { push } = useToast();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hours, setHours] = useState<Record<number, { enabled: boolean; startTime: string; endTime: string }>>({});
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  function load() {
    return api.get<DoctorProfile>(`/doctors/${id}`).then((res) => {
      setDoctor(res.data);
      const map: Record<number, { enabled: boolean; startTime: string; endTime: string }> = {};
      for (let d = 0; d < 7; d++) map[d] = { enabled: false, startTime: "09:00", endTime: "17:00" };
      for (const wh of res.data.workingHours) map[wh.dayOfWeek] = { enabled: true, startTime: wh.startTime, endTime: wh.endTime };
      setHours(map);
    });
  }

  useEffect(() => {
    load()
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveHours() {
    setBusy(true);
    setError(null);
    try {
      const payload = Object.entries(hours)
        .filter(([, v]) => v.enabled)
        .map(([dayOfWeek, v]) => ({ dayOfWeek: Number(dayOfWeek), startTime: v.startTime, endTime: v.endTime }));
      await api.put(`/admin/doctors/${id}/working-hours`, { hours: payload });
      push("Working hours updated.", "success");
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function addLeave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post(`/admin/doctors/${id}/leave`, { date: leaveDate, reason: leaveReason || undefined });
      push(
        data.affectedCount > 0
          ? `Leave added. ${data.affectedCount} affected patient(s) were notified automatically.`
          : "Leave day added.",
        "success"
      );
      setLeaveDate("");
      setLeaveReason("");
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeLeave(leaveId: string) {
    await api.delete(`/admin/doctors/${id}/leave/${leaveId}`);
    await load();
  }

  async function toggleActive() {
    if (!doctor) return;
    await api.patch(`/admin/doctors/${id}`, { isActive: !doctor.isActive });
    await load();
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-14"><DetailPageSkeleton /></div>;
  if (!doctor) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-wider text-terracotta-800">{doctor.specialization}</p>
      <div className="flex items-center justify-between">
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Dr. {doctor.user.name}</h1>
        <Button variant={doctor.isActive ? "ghost" : "secondary"} size="sm" onClick={toggleActive}>
          {doctor.isActive ? "Deactivate" : "Reactivate"}
        </Button>
      </div>

      <Card className="mt-8 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Working hours</h2>
        <div className="mt-4 space-y-2">
          {DAYS.map((label, d) => (
            <div key={d} className="flex items-center gap-3">
              <label className="flex w-24 items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-soft">
                <input
                  type="checkbox"
                  checked={hours[d]?.enabled ?? false}
                  onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], enabled: e.target.checked } }))}
                />
                {label}
              </label>
              <Input
                type="time"
                className="w-32"
                disabled={!hours[d]?.enabled}
                value={hours[d]?.startTime ?? "09:00"}
                onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], startTime: e.target.value } }))}
              />
              <span className="text-ink-soft">–</span>
              <Input
                type="time"
                className="w-32"
                disabled={!hours[d]?.enabled}
                value={hours[d]?.endTime ?? "17:00"}
                onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], endTime: e.target.value } }))}
              />
            </div>
          ))}
        </div>
        <FieldError>{error}</FieldError>
        <Button className="mt-4" onClick={saveHours} loading={busy}>Save hours</Button>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Leave days</h2>
        <p className="mt-1 text-sm text-ink-soft">Marking a leave day automatically cancels and notifies any patients already booked that day.</p>

        <form onSubmit={addLeave} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="leave-date">Date</Label>
            <Input id="leave-date" type="date" required value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[10rem]">
            <Label htmlFor="leave-reason">Reason (optional)</Label>
            <Input id="leave-reason" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
          </div>
          <Button type="submit" loading={busy}>Add leave</Button>
        </form>

        <div className="mt-5 space-y-2">
          {doctor.leaveDays.length === 0 && <p className="text-sm text-ink-soft">No upcoming leave.</p>}
          {doctor.leaveDays.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border border-ink/10 px-4 py-2.5">
              <span className="font-mono text-sm text-ink">{format(new Date(l.date), "MMM d, yyyy")}{l.reason ? ` — ${l.reason}` : ""}</span>
              <button onClick={() => removeLeave(l.id)} className="cursor-pointer font-mono text-xs uppercase tracking-wider text-clay-600 hover:underline">
                Remove
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

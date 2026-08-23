import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { api, extractErrorMessage } from "../../lib/api";
import type { Appointment, DoctorProfile, SlotCandidate } from "../../types/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Label, Textarea, FieldError } from "../../components/ui/Field";
import { Spinner } from "../../components/ui/Spinner";
import { UrgencyBadge } from "../../components/ui/Badge";
import { DetailPageSkeleton, SlotGridSkeleton } from "../../components/ui/Skeleton";
import { NodeNetwork } from "../../components/motifs/NodeNetwork";
import { useToast } from "../../components/ui/Toast";

type Step = "browse" | "symptoms" | "confirmed";

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { push } = useToast();

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots] = useState<SlotCandidate[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("browse");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [symptomsText, setSymptomsText] = useState("");
  const [holdSeconds, setHoldSeconds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<DoctorProfile>(`/doctors/${id}`).then((res) => setDoctor(res.data)).catch((err) => setError(extractErrorMessage(err)));
  }, [id]);

  useEffect(() => {
    if (step !== "browse") return;
    setSlotsLoading(true);
    api
      .get<SlotCandidate[]>(`/doctors/${id}/availability`, { params: { date } })
      .then((res) => setSlots(res.data))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setSlotsLoading(false));
  }, [id, date, step]);

  useEffect(() => {
    if (!appointment?.holdExpiresAt || step === "confirmed") return;
    const tick = () => {
      const secs = Math.max(0, Math.round((new Date(appointment.holdExpiresAt!).getTime() - Date.now()) / 1000));
      setHoldSeconds(secs);
      if (secs === 0) {
        push("Your slot hold expired. Please pick a time again.", "error");
        setStep("browse");
        setAppointment(null);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [appointment, step, push]);

  const holdMMSS = useMemo(() => {
    if (holdSeconds == null) return "--:--";
    const m = Math.floor(holdSeconds / 60).toString().padStart(2, "0");
    const s = (holdSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [holdSeconds]);

  async function pickSlot(slotStart: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<Appointment>("/appointments/hold", { doctorId: id, slotStart });
      setAppointment(data);
      setStep("symptoms");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitSymptoms() {
    if (!appointment) return;
    setBusy(true);
    setError(null);
    try {
      const { data: form } = await api.post(`/appointments/${appointment.id}/symptoms`, { symptomsText });
      const { data: full } = await api.get<Appointment>(`/appointments/${appointment.id}`);
      setAppointment({ ...full, symptomForm: form });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function retryLlm() {
    if (!appointment) return;
    setBusy(true);
    try {
      const { data: form } = await api.post(`/appointments/${appointment.id}/symptoms/retry-llm`);
      setAppointment((a) => (a ? { ...a, symptomForm: form } : a));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!appointment) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/appointments/${appointment.id}/confirm`);
      setStep("confirmed");
      push("Appointment confirmed — check your email for details.", "success");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!doctor && !error) return <div className="mx-auto max-w-3xl px-6 py-14"><DetailPageSkeleton /></div>;
  if (error && !doctor) return <p className="mx-auto max-w-3xl px-6 py-14 text-clay-600">{error}</p>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      {doctor && (
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-wider text-terracotta-800">{doctor.specialization}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Dr. {doctor.user.name}</h1>
          <p className="mt-2 text-ink-soft">{doctor.bio}</p>
        </div>
      )}

      {step === "browse" && (
        <Card className="p-6">
          <Label htmlFor="date">Pick a date</Label>
          <Input id="date" type="date" min={format(new Date(), "yyyy-MM-dd")} value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />

          <div className="mt-6">
            {slotsLoading && <SlotGridSkeleton />}
            {!slotsLoading && slots.length === 0 && (
              <p className="text-ink-soft">No slots available this day — try another date.</p>
            )}
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s.start}
                  disabled={!s.available || busy}
                  onClick={() => pickSlot(s.start)}
                  className="rounded-lg border border-ink/12 bg-paper px-3 py-2.5 font-mono text-sm text-ink transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-pine-700 hover:bg-sage-100 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {format(new Date(s.start), "h:mm a")}
                </button>
              ))}
            </div>
          </div>
          <FieldError>{error}</FieldError>
        </Card>
      )}

      {step === "symptoms" && appointment && (
        <Card className="p-6">
          <div className="flex items-center justify-between rounded-lg bg-gold-200 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-terracotta-800">
            <span>Slot held — complete within</span>
            <span className="font-feature-tnum text-sm">{holdMMSS}</span>
          </div>

          <h2 className="mt-6 font-display text-2xl font-semibold text-ink">
            {format(new Date(appointment.slotStart), "EEEE, MMM d 'at' h:mm a")}
          </h2>

          {!appointment.symptomForm && (
            <div className="mt-6">
              <Label htmlFor="symptoms">Describe your symptoms</Label>
              <Textarea
                id="symptoms"
                rows={5}
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="What's bothering you? When did it start? Anything that makes it better or worse?"
              />
              <FieldError>{error}</FieldError>
              <Button className="mt-4" onClick={submitSymptoms} loading={busy} disabled={symptomsText.trim().length < 10}>
                Continue
              </Button>
            </div>
          )}

          {appointment.symptomForm && (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-pine-700/15 bg-sage-100 p-5">
                <div className="mb-3 flex items-center gap-2 text-pine-700">
                  <NodeNetwork className="h-6 w-8" />
                  <p className="font-mono text-xs uppercase tracking-wider">AI pre-visit summary</p>
                </div>

                {appointment.symptomForm.llmStatus === "COMPLETED" && (
                  <>
                    {appointment.symptomForm.urgencyLevel && <UrgencyBadge level={appointment.symptomForm.urgencyLevel} />}
                    <p className="mt-3 font-display text-lg text-ink">{appointment.symptomForm.chiefComplaint}</p>
                    <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-ink-soft">
                      {(appointment.symptomForm.suggestedQuestions ?? []).map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </>
                )}
                {appointment.symptomForm.llmStatus === "PENDING" && (
                  <p className="flex items-center gap-2 text-sm text-ink-soft"><Spinner className="h-4 w-4" /> Analyzing symptoms…</p>
                )}
                {appointment.symptomForm.llmStatus === "FAILED" && (
                  <div>
                    <p className="text-sm text-clay-600">
                      AI summary is temporarily unavailable — your symptoms are saved and your doctor will review them directly.
                    </p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={retryLlm} loading={busy}>
                      Retry AI summary
                    </Button>
                  </div>
                )}
              </div>

              <Button size="lg" className="w-full" onClick={confirm} loading={busy}>
                Confirm appointment
              </Button>
              <FieldError>{error}</FieldError>
            </div>
          )}
        </Card>
      )}

      {step === "confirmed" && (
        <Card className="p-8 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-pine-700">All set</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Appointment confirmed</h2>
          <p className="mt-3 text-ink-soft">
            We've emailed confirmations to you and Dr. {doctor?.user.name}, and added it to your calendar if connected.
          </p>
          <Button className="mt-6" onClick={() => navigate("/app/appointments")}>
            View my appointments
          </Button>
        </Card>
      )}
    </div>
  );
}

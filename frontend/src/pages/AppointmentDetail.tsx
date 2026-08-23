import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Appointment, PrescriptionItem } from "../types/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Textarea, Input, Label, FieldError } from "../components/ui/Field";
import { StatusBadge, UrgencyBadge } from "../components/ui/Badge";
import { DetailPageSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { NodeNetwork } from "../components/motifs/NodeNetwork";

const emptyPrescriptionItem: PrescriptionItem = { medication: "", dosage: "", frequencyPerDay: 1, durationDays: 5, instructions: "" };

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([{ ...emptyPrescriptionItem }]);

  const load = () => api.get<Appointment>(`/appointments/${id}`).then((res) => setAppt(res.data));

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  async function cancel() {
    if (!confirm("Cancel this appointment? Both parties will be notified by email.")) return;
    setBusy(true);
    try {
      await api.post(`/appointments/${id}/cancel`, {});
      push("Appointment cancelled.", "success");
      await load();
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function submitVisitNote() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/appointments/${id}/visit-notes`, {
        clinicalNotes,
        diagnosis: diagnosis || undefined,
        prescription: prescription.filter((p) => p.medication.trim()),
      });
      push("Visit note saved and shared with the patient.", "success");
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function retryVisitLlm() {
    setBusy(true);
    try {
      const { data } = await api.post(`/appointments/${id}/visit-notes/retry-llm`);
      setAppt((a) => (a ? { ...a, visitNote: data } : a));
    } catch (err) {
      push(extractErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-14"><DetailPageSkeleton /></div>;
  if (error || !appt) return <p className="mx-auto max-w-3xl px-6 py-14 text-clay-600">{error ?? "Not found"}</p>;

  const isDoctor = user?.role === "DOCTOR";
  const otherParty = isDoctor ? appt.patient.user.name : `Dr. ${appt.doctor.user.name}`;
  const canCancel = appt.status === "CONFIRMED" || appt.status === "HELD";
  const canWriteVisitNote = isDoctor && appt.status === "CONFIRMED";

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-terracotta-800">{isDoctor ? "Patient visit" : appt.doctor.specialization}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{otherParty}</h1>
          <p className="mt-1 font-mono text-sm text-ink-soft">{format(new Date(appt.slotStart), "EEEE, MMM d 'at' h:mm a")}</p>
        </div>
        <div className="flex items-center gap-2">
          {appt.symptomForm?.urgencyLevel && <UrgencyBadge level={appt.symptomForm.urgencyLevel} />}
          <StatusBadge status={appt.status} />
        </div>
      </div>

      {appt.symptomForm && (
        <Card className="mt-8 p-6">
          <div className="mb-3 flex items-center gap-2 text-pine-700">
            <NodeNetwork className="h-6 w-8" />
            <p className="font-mono text-xs uppercase tracking-wider">Pre-visit symptom report</p>
          </div>
          <p className="text-ink">{appt.symptomForm.symptomsText}</p>
          {appt.symptomForm.llmStatus === "COMPLETED" && (
            <div className="mt-4 rounded-lg bg-sage-100 p-4">
              <p className="font-display text-lg text-ink">{appt.symptomForm.chiefComplaint}</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-soft">
                {(appt.symptomForm.suggestedQuestions ?? []).map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}
          {appt.symptomForm.llmStatus === "FAILED" && (
            <p className="mt-3 text-sm text-clay-600">AI summary unavailable — review the raw symptoms above.</p>
          )}
        </Card>
      )}

      {appt.visitNote && (
        <Card className="mt-6 p-6">
          <p className="font-mono text-xs uppercase tracking-wider text-pine-700">Visit summary</p>
          {isDoctor ? (
            <>
              <p className="mt-3 whitespace-pre-wrap text-ink">{appt.visitNote.clinicalNotes}</p>
              {appt.visitNote.diagnosis && <p className="mt-2 text-sm text-ink-soft">Diagnosis: {appt.visitNote.diagnosis}</p>}
            </>
          ) : appt.visitNote.llmStatus === "COMPLETED" ? (
            <>
              <p className="mt-3 whitespace-pre-wrap font-display text-lg leading-relaxed text-ink">{appt.visitNote.patientSummary}</p>
              <p className="mt-4 whitespace-pre-wrap text-sm text-ink-soft">{appt.visitNote.followUpSteps}</p>
            </>
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-ink">{appt.visitNote.clinicalNotes}</p>
          )}
          {appt.visitNote.prescription.length > 0 && (
            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">Prescription</p>
              <ul className="mt-2 space-y-1 text-sm text-ink">
                {appt.visitNote.prescription.map((p, i) => (
                  <li key={i}>{p.medication} — {p.dosage ?? ""} · {p.frequencyPerDay}x/day for {p.durationDays} days</li>
                ))}
              </ul>
            </div>
          )}
          {appt.visitNote.llmStatus === "FAILED" && isDoctor && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={retryVisitLlm} loading={busy}>Retry patient-friendly summary</Button>
          )}
        </Card>
      )}

      {canWriteVisitNote && !appt.visitNote && (
        <Card className="mt-6 p-6">
          <p className="font-mono text-xs uppercase tracking-wider text-pine-700">Write visit note</p>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="diagnosis">Diagnosis (optional)</Label>
              <Input id="diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="notes">Clinical notes</Label>
              <Textarea id="notes" rows={5} value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} />
            </div>
            <div>
              <Label>Prescription</Label>
              <div className="space-y-3">
                {prescription.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-ink/10 p-3 sm:grid-cols-4">
                    <Input placeholder="Medication" value={p.medication} onChange={(e) => setPrescription((arr) => arr.map((x, j) => (j === i ? { ...x, medication: e.target.value } : x)))} />
                    <Input placeholder="Dosage (e.g. 500mg)" value={p.dosage} onChange={(e) => setPrescription((arr) => arr.map((x, j) => (j === i ? { ...x, dosage: e.target.value } : x)))} />
                    <Input type="number" min={1} max={12} placeholder="Times/day" value={p.frequencyPerDay} onChange={(e) => setPrescription((arr) => arr.map((x, j) => (j === i ? { ...x, frequencyPerDay: Number(e.target.value) } : x)))} />
                    <Input type="number" min={1} placeholder="Days" value={p.durationDays} onChange={(e) => setPrescription((arr) => arr.map((x, j) => (j === i ? { ...x, durationDays: Number(e.target.value) } : x)))} />
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2" type="button" onClick={() => setPrescription((arr) => [...arr, { ...emptyPrescriptionItem }])}>
                + Add medication
              </Button>
            </div>
            <FieldError>{error}</FieldError>
            <Button onClick={submitVisitNote} loading={busy} disabled={clinicalNotes.trim().length < 10}>
              Save & notify patient
            </Button>
          </div>
        </Card>
      )}

      {canCancel && (
        <div className="mt-8 flex gap-3">
          <Button variant="danger" onClick={cancel} loading={busy}>Cancel appointment</Button>
          {!isDoctor && (
            <Button variant="ghost" onClick={() => navigate(`/app/doctors/${appt.doctorId}`)}>Book a different time</Button>
          )}
        </div>
      )}
    </div>
  );
}

import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/apiError";
import { generatePostVisitSummary } from "../llm/llm.service";
import { queueNotification } from "../notifications/notification.service";

interface PrescriptionItem {
  medication: string;
  dosage?: string;
  frequencyPerDay: number;
  durationDays: number;
  instructions?: string;
}

/** Expands a prescription's frequency into individual dose-reminder rows,
 *  spread evenly across each day starting at 08:00, for durationDays days
 *  starting tomorrow. The background job in src/jobs sends each one as it
 *  comes due. */
function expandReminders(appointmentId: string, prescription: PrescriptionItem[]) {
  const rows: { appointmentId: string; medication: string; dosage?: string; scheduledAt: Date }[] = [];
  const dayStartHour = 8;
  const dayEndHour = 22;

  for (const item of prescription) {
    const interval = item.frequencyPerDay > 1 ? (dayEndHour - dayStartHour) / (item.frequencyPerDay - 1) : 0;
    for (let day = 0; day < item.durationDays; day++) {
      for (let dose = 0; dose < item.frequencyPerDay; dose++) {
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + day + 1); // start the day after the visit
        const hour = item.frequencyPerDay === 1 ? dayStartHour : dayStartHour + interval * dose;
        scheduledAt.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
        rows.push({ appointmentId, medication: item.medication, dosage: item.dosage, scheduledAt });
      }
    }
  }
  return rows;
}

/**
 * Doctor submits clinical notes + prescription after the visit. This:
 *  1. Persists the raw clinical record (source of truth, always saved).
 *  2. Attempts an LLM rewrite into a patient-friendly summary — on failure
 *     the raw notes remain saved and llmStatus=FAILED is recorded so the
 *     patient still sees *something* (the raw notes) rather than nothing.
 *  3. Expands the prescription into medication reminder rows.
 *  4. Marks the appointment COMPLETED and emails the patient.
 */
export async function submitVisitNote(
  appointmentId: string,
  doctorUserId: string,
  input: { clinicalNotes: string; diagnosis?: string; prescription: PrescriptionItem[] }
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: true, patient: { include: { user: true } } },
  });
  if (!appt) throw ApiError.notFound("Appointment not found");
  if (appt.doctor.userId !== doctorUserId) throw ApiError.forbidden();
  if (appt.status !== "CONFIRMED") throw ApiError.badRequest("Only confirmed appointments can receive visit notes");

  const note = await prisma.visitNote.upsert({
    where: { appointmentId },
    update: {
      clinicalNotes: input.clinicalNotes,
      diagnosis: input.diagnosis,
      prescription: input.prescription as unknown as Prisma.InputJsonValue,
    },
    create: {
      appointmentId,
      clinicalNotes: input.clinicalNotes,
      diagnosis: input.diagnosis,
      prescription: input.prescription as unknown as Prisma.InputJsonValue,
    },
  });

  const llmResult = await generatePostVisitSummary(
    `Diagnosis: ${input.diagnosis ?? "n/a"}\nNotes: ${input.clinicalNotes}\nPrescription: ${JSON.stringify(input.prescription)}`
  );

  const updatedNote = llmResult.ok
    ? await prisma.visitNote.update({
        where: { id: note.id },
        data: {
          llmStatus: "COMPLETED",
          patientSummary: llmResult.data.patientSummary,
          followUpSteps: `${llmResult.data.medicationSchedule}\n\n${llmResult.data.followUpSteps}`,
          llmError: null,
        },
      })
    : await prisma.visitNote.update({
        where: { id: note.id },
        data: { llmStatus: "FAILED", llmError: llmResult.error, llmRetryCount: { increment: 1 } },
      });

  if (input.prescription.length > 0) {
    const reminders = expandReminders(appointmentId, input.prescription);
    if (reminders.length > 0) await prisma.medicationReminder.createMany({ data: reminders });
  }

  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: "COMPLETED" } });

  await queueNotification({
    userId: appt.patient.userId,
    appointmentId,
    type: "POST_VISIT_SUMMARY",
    subject: "Your visit summary is ready",
    body: llmResult.ok
      ? `Hi ${appt.patient.user.name},\n\n${llmResult.data.patientSummary}\n\nMedication schedule:\n${llmResult.data.medicationSchedule}\n\nFollow-up:\n${llmResult.data.followUpSteps}`
      : `Hi ${appt.patient.user.name},\n\nYour doctor's notes from today's visit:\n\n${input.clinicalNotes}\n\n(An AI-simplified summary could not be generated this time — these are your doctor's original notes.)`,
  });

  return updatedNote;
}

export async function retryPostVisitLlm(appointmentId: string) {
  const note = await prisma.visitNote.findUnique({ where: { appointmentId } });
  if (!note) throw ApiError.notFound("No visit note to retry");
  const result = await generatePostVisitSummary(`Notes: ${note.clinicalNotes}\nPrescription: ${JSON.stringify(note.prescription)}`);
  if (result.ok) {
    return prisma.visitNote.update({
      where: { id: note.id },
      data: {
        llmStatus: "COMPLETED",
        patientSummary: result.data.patientSummary,
        followUpSteps: `${result.data.medicationSchedule}\n\n${result.data.followUpSteps}`,
        llmError: null,
      },
    });
  }
  return prisma.visitNote.update({
    where: { id: note.id },
    data: { llmStatus: "FAILED", llmError: result.error, llmRetryCount: { increment: 1 } },
  });
}

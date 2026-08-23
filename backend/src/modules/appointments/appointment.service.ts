import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/apiError";
import { env } from "../../config/env";
import { generatePreVisitSummary } from "../llm/llm.service";
import { queueNotification } from "../notifications/notification.service";
import {
  createCalendarEventsForAppointment,
  updateCalendarEventsForAppointment,
  deleteCalendarEventsForAppointment,
} from "../calendar/googleCalendar.service";

const FULL_INCLUDE = {
  patient: { include: { user: true } },
  doctor: { include: { user: true } },
  symptomForm: true,
  visitNote: true,
} satisfies Prisma.AppointmentInclude;

async function getPatientProfileId(userId: string) {
  const p = await prisma.patientProfile.findUnique({ where: { userId } });
  if (!p) throw ApiError.badRequest("Only patients can perform this action");
  return p.id;
}

/**
 * Step 1 of booking: reserve a slot for SLOT_HOLD_MINUTES while the patient
 * fills the symptom form. This is the "slot hold" mechanism — it exists so
 * two patients can't both be filling out the same slot's symptom form only
 * to have one lose out at the very end.
 *
 * Concurrency safety has two layers:
 *  1. Inside a transaction we opportunistically delete this doctor+slotStart
 *     row IF it is a HELD row whose hold has expired — this reclaims stale
 *     holds without a separate cleanup pass having to run first.
 *  2. We then INSERT the new HELD row. The @@unique([doctorId, slotStart])
 *     constraint in the schema means that if a concurrent request already
 *     holds/confirmed this exact slot, the insert throws Prisma P2002, which
 *     the global error handler converts to HTTP 409. No amount of race
 *     between step 1 and step 2 across two requests can result in two rows
 *     for the same doctor+slotStart — Postgres enforces that atomically at
 *     the constraint level regardless of what either transaction believed
 *     was true when it started.
 */
export async function holdSlot(patientUserId: string, doctorId: string, slotStartIso: string) {
  const patientId = await getPatientProfileId(patientUserId);
  const slotStart = new Date(slotStartIso);
  if (slotStart.getTime() <= Date.now()) throw ApiError.badRequest("Cannot book a slot in the past");

  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor || !doctor.isActive) throw ApiError.notFound("Doctor not found");

  const slotEnd = new Date(slotStart.getTime() + doctor.slotDurationMinutes * 60_000);

  const leave = await prisma.leaveDay.findUnique({
    where: { doctorId_date: { doctorId, date: new Date(slotStart.toDateString()) } },
  });
  if (leave) throw ApiError.conflict("The doctor is on leave on this date");

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      await tx.appointment.deleteMany({
        where: { doctorId, slotStart, status: "HELD", holdExpiresAt: { lt: new Date() } },
      });
      return tx.appointment.create({
        data: {
          patientId,
          doctorId,
          slotStart,
          slotEnd,
          status: "HELD",
          holdExpiresAt: new Date(Date.now() + env.SLOT_HOLD_MINUTES * 60_000),
        },
        include: FULL_INCLUDE,
      });
    });
    return appointment;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw ApiError.conflict("This slot was just taken. Please pick a different time.");
    }
    throw err;
  }
}

export async function submitSymptoms(
  appointmentId: string,
  patientUserId: string,
  input: { symptomsText: string; durationDays?: number; severitySelfRating?: number }
) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { patient: true } });
  if (!appt) throw ApiError.notFound("Appointment not found");
  if (appt.patient.userId !== patientUserId) throw ApiError.forbidden();
  if (appt.status !== "HELD") throw ApiError.badRequest("Appointment is not awaiting a symptom form");
  if (!appt.holdExpiresAt || appt.holdExpiresAt.getTime() < Date.now()) {
    throw new ApiError(410, "Your slot hold has expired. Please select the slot again.");
  }

  const form = await prisma.symptomForm.upsert({
    where: { appointmentId },
    update: { symptomsText: input.symptomsText, durationDays: input.durationDays, severitySelfRating: input.severitySelfRating },
    create: { appointmentId, symptomsText: input.symptomsText, durationDays: input.durationDays, severitySelfRating: input.severitySelfRating },
  });

  return runPreVisitLlm(form.id);
}

async function runPreVisitLlm(symptomFormId: string) {
  const form = await prisma.symptomForm.findUniqueOrThrow({ where: { id: symptomFormId } });
  const result = await generatePreVisitSummary(form.symptomsText);

  if (result.ok) {
    return prisma.symptomForm.update({
      where: { id: symptomFormId },
      data: {
        llmStatus: "COMPLETED",
        urgencyLevel: result.data.urgencyLevel.toUpperCase() as "LOW" | "MEDIUM" | "HIGH",
        chiefComplaint: result.data.chiefComplaint,
        suggestedQuestions: result.data.suggestedQuestions,
        llmError: null,
      },
    });
  }

  return prisma.symptomForm.update({
    where: { id: symptomFormId },
    data: { llmStatus: "FAILED", llmError: result.error, llmRetryCount: { increment: 1 } },
  });
}

/** Lets the patient or doctor manually retry a failed pre-visit LLM call
 *  (e.g. after the provider's outage clears) without resubmitting symptoms. */
export async function retryPreVisitLlm(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: { symptomForm: true } });
  if (!appt?.symptomForm) throw ApiError.notFound("No symptom form to retry");
  return runPreVisitLlm(appt.symptomForm.id);
}

/**
 * Step 2 of booking: converts a HELD slot into a CONFIRMED appointment.
 * Requires a symptom form to already exist (the product requirement:
 * "Patient fills a symptom form before confirming"). Confirmation itself
 * only touches the row that's already uniquely reserved for this
 * doctor+slotStart, so no additional locking is needed here — the
 * uniqueness fight already happened at hold time.
 */
export async function confirmAppointment(appointmentId: string, patientUserId: string) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: FULL_INCLUDE });
  if (!appt) throw ApiError.notFound("Appointment not found");
  if (appt.patient.userId !== patientUserId) throw ApiError.forbidden();
  if (appt.status !== "HELD") throw ApiError.badRequest("Appointment is not in a confirmable state");
  if (!appt.holdExpiresAt || appt.holdExpiresAt.getTime() < Date.now()) {
    throw new ApiError(410, "Your slot hold has expired. Please select the slot again.");
  }
  if (!appt.symptomForm) throw ApiError.badRequest("Please fill the symptom form before confirming");

  const confirmed = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CONFIRMED", holdExpiresAt: null },
    include: FULL_INCLUDE,
  });

  const when = confirmed.slotStart.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });

  await queueNotification({
    userId: confirmed.patient.userId,
    appointmentId: confirmed.id,
    type: "BOOKING_CONFIRMATION",
    subject: "Appointment confirmed",
    body: `Hi ${confirmed.patient.user.name},\n\nYour appointment with Dr. ${confirmed.doctor.user.name} (${confirmed.doctor.specialization}) is confirmed for ${when}.\n\nSee you then!`,
  });
  await queueNotification({
    userId: confirmed.doctor.userId,
    appointmentId: confirmed.id,
    type: "BOOKING_CONFIRMATION",
    subject: "New appointment booked",
    body: `Hi Dr. ${confirmed.doctor.user.name},\n\n${confirmed.patient.user.name} booked an appointment with you for ${when}.\n\nUrgency (AI pre-visit triage): ${confirmed.symptomForm?.urgencyLevel ?? "not yet assessed"}.`,
  });

  const reminderAt = new Date(confirmed.slotStart.getTime() - env.APPOINTMENT_REMINDER_HOURS_BEFORE * 3_600_000);
  if (reminderAt.getTime() > Date.now()) {
    await prisma.notification.create({
      data: {
        userId: confirmed.patient.userId,
        appointmentId: confirmed.id,
        type: "APPOINTMENT_REMINDER",
        subject: "Reminder: upcoming appointment",
        body: `Hi ${confirmed.patient.user.name}, this is a reminder that you have an appointment with Dr. ${confirmed.doctor.user.name} on ${when}.`,
        nextAttemptAt: reminderAt,
      },
    });
  }

  await createCalendarEventsForAppointment(confirmed.id).catch(() => undefined);

  return prisma.appointment.findUniqueOrThrow({ where: { id: confirmed.id }, include: FULL_INCLUDE });
}

export async function cancelAppointment(
  appointmentId: string,
  actorUserId: string,
  actorRole: Role,
  reason: string | undefined
) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: FULL_INCLUDE });
  if (!appt) throw ApiError.notFound("Appointment not found");

  const isOwner = appt.patient.userId === actorUserId || appt.doctor.userId === actorUserId;
  if (!isOwner && actorRole !== "ADMIN") throw ApiError.forbidden();
  if (appt.status === "CANCELLED" || appt.status === "COMPLETED") {
    throw ApiError.badRequest(`Appointment is already ${appt.status.toLowerCase()}`);
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED", cancelledBy: actorRole, cancelledReason: reason },
    include: FULL_INCLUDE,
  });

  const when = updated.slotStart.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  for (const userId of [updated.patient.userId, updated.doctor.userId]) {
    await queueNotification({
      userId,
      appointmentId: updated.id,
      type: "CANCELLATION",
      subject: "Appointment cancelled",
      body: `The appointment on ${when} between ${updated.patient.user.name} and Dr. ${updated.doctor.user.name} has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
    });
  }

  await deleteCalendarEventsForAppointment(updated.id).catch(() => undefined);
  return updated;
}

export async function rescheduleAppointment(appointmentId: string, patientUserId: string, newSlotStartIso: string) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: FULL_INCLUDE });
  if (!appt) throw ApiError.notFound("Appointment not found");
  if (appt.patient.userId !== patientUserId) throw ApiError.forbidden();
  if (appt.status !== "CONFIRMED") throw ApiError.badRequest("Only confirmed appointments can be rescheduled");

  const newSlotStart = new Date(newSlotStartIso);
  if (newSlotStart.getTime() <= Date.now()) throw ApiError.badRequest("Cannot reschedule into the past");
  const newSlotEnd = new Date(newSlotStart.getTime() + appt.doctor.slotDurationMinutes * 60_000);

  const leave = await prisma.leaveDay.findUnique({
    where: { doctorId_date: { doctorId: appt.doctorId, date: new Date(newSlotStart.toDateString()) } },
  });
  if (leave) throw ApiError.conflict("The doctor is on leave on this date");

  let updated;
  try {
    // Relies on the same @@unique([doctorId, slotStart]) constraint as
    // holdSlot() — moving into an occupied slot throws P2002 -> 409.
    updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { slotStart: newSlotStart, slotEnd: newSlotEnd },
      include: FULL_INCLUDE,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw ApiError.conflict("That slot is already taken. Please choose a different time.");
    }
    throw err;
  }

  const when = updated.slotStart.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  for (const userId of [updated.patient.userId, updated.doctor.userId]) {
    await queueNotification({
      userId,
      appointmentId: updated.id,
      type: "RESCHEDULE",
      subject: "Appointment rescheduled",
      body: `The appointment between ${updated.patient.user.name} and Dr. ${updated.doctor.user.name} has been moved to ${when}.`,
    });
  }

  await updateCalendarEventsForAppointment(updated.id).catch(() => undefined);
  return updated;
}

export async function getMyAppointments(userId: string, role: Role) {
  if (role === "PATIENT") {
    const patient = await prisma.patientProfile.findUnique({ where: { userId } });
    if (!patient) return [];
    return prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: FULL_INCLUDE,
      orderBy: { slotStart: "desc" },
    });
  }
  if (role === "DOCTOR") {
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId } });
    if (!doctor) return [];
    return prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      include: FULL_INCLUDE,
      orderBy: { slotStart: "desc" },
    });
  }
  return prisma.appointment.findMany({ include: FULL_INCLUDE, orderBy: { slotStart: "desc" }, take: 200 });
}

export async function getAppointmentById(appointmentId: string, userId: string, role: Role) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, include: FULL_INCLUDE });
  if (!appt) throw ApiError.notFound("Appointment not found");
  const isOwner = appt.patient.userId === userId || appt.doctor.userId === userId;
  if (!isOwner && role !== "ADMIN") throw ApiError.forbidden();
  return appt;
}

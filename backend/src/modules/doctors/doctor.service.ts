import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/apiError";
import { queueNotification } from "../notifications/notification.service";
import { deleteCalendarEventsForAppointment } from "../calendar/googleCalendar.service";

export async function listDoctors(specialization?: string) {
  return prisma.doctorProfile.findMany({
    where: {
      isActive: true,
      ...(specialization ? { specialization: { contains: specialization, mode: "insensitive" } } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { specialization: "asc" },
  });
}

export async function getDoctor(doctorId: string) {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      workingHours: true,
      leaveDays: { where: { date: { gte: new Date() } }, orderBy: { date: "asc" } },
    },
  });
  if (!doctor) throw ApiError.notFound("Doctor not found");
  return doctor;
}

/** Admin-only: provisions a new doctor account. Returns the temp password
 *  once (never stored in plaintext) so the admin can hand it to the doctor,
 *  and fires the invite off through the same email pipeline as everything
 *  else so failures degrade the same way. */
export async function createDoctor(input: {
  email: string;
  name: string;
  phone?: string;
  password?: string;
  specialization: string;
  bio?: string;
  qualifications?: string;
  slotDurationMinutes: number;
  consultationFee?: number;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const tempPassword = input.password ?? crypto.randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const doctor = await prisma.doctorProfile.create({
    data: {
      specialization: input.specialization,
      bio: input.bio,
      qualifications: input.qualifications,
      slotDurationMinutes: input.slotDurationMinutes,
      consultationFee: input.consultationFee,
      user: {
        create: {
          email: input.email,
          name: input.name,
          phone: input.phone,
          role: "DOCTOR",
          passwordHash,
        },
      },
    },
    include: { user: true },
  });

  await queueNotification({
    userId: doctor.userId,
    type: "BOOKING_CONFIRMATION",
    subject: "Your clinic doctor account has been created",
    body:
      `Hi Dr. ${doctor.user.name},\n\nAn admin has created a doctor account for you.\n\n` +
      `Login email: ${input.email}\nTemporary password: ${tempPassword}\n\n` +
      `Please log in and change your password as soon as possible.`,
  });

  return { doctor, tempPassword };
}

export async function updateDoctor(
  doctorId: string,
  input: Partial<{
    specialization: string;
    bio: string;
    qualifications: string;
    slotDurationMinutes: number;
    consultationFee: number;
    isActive: boolean;
  }>
) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) throw ApiError.notFound("Doctor not found");
  return prisma.doctorProfile.update({ where: { id: doctorId }, data: input });
}

export async function setWorkingHours(
  doctorId: string,
  hours: { dayOfWeek: number; startTime: string; endTime: string }[]
) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  if (!doctor) throw ApiError.notFound("Doctor not found");

  return prisma.$transaction(async (tx) => {
    await tx.workingHour.deleteMany({ where: { doctorId } });
    if (hours.length === 0) return [];
    await tx.workingHour.createMany({ data: hours.map((h) => ({ doctorId, ...h })) });
    return tx.workingHour.findMany({ where: { doctorId } });
  });
}

/**
 * Marks a doctor on leave for a date. Any CONFIRMED (or still-active HELD)
 * appointments on that date are cancelled, the affected patients are queued
 * an email notification, and their Google Calendar events are torn down.
 * This is the "doctor leave conflict handling" requirement from the brief.
 */
export async function addLeaveDay(doctorId: string, dateStr: string, reason?: string) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: doctorId }, include: { user: true } });
  if (!doctor) throw ApiError.notFound("Doctor not found");

  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(date);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const leave = await prisma.leaveDay.upsert({
    where: { doctorId_date: { doctorId, date } },
    update: { reason },
    create: { doctorId, date, reason },
  });

  const affected = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStart: { gte: date, lt: dayEnd },
      status: { in: ["CONFIRMED", "HELD"] },
    },
    include: { patient: { include: { user: true } } },
  });

  for (const appt of affected) {
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELLED", cancelledBy: "ADMIN", cancelledReason: `Dr. ${doctor.user.name} is on leave` },
    });

    await queueNotification({
      userId: appt.patient.userId,
      appointmentId: appt.id,
      type: "LEAVE_NOTICE",
      subject: "Your appointment has been cancelled — doctor on leave",
      body:
        `Hi ${appt.patient.user.name},\n\nUnfortunately Dr. ${doctor.user.name} is unavailable on ` +
        `${dateStr}${reason ? ` (${reason})` : ""}, so your appointment scheduled for ` +
        `${appt.slotStart.toISOString()} has been cancelled. Please rebook at your convenience — we're sorry ` +
        `for the inconvenience.`,
    });

    await deleteCalendarEventsForAppointment(appt.id).catch(() => undefined);
  }

  return { leave, affectedCount: affected.length };
}

export async function removeLeaveDay(doctorId: string, leaveId: string) {
  const leave = await prisma.leaveDay.findUnique({ where: { id: leaveId } });
  if (!leave || leave.doctorId !== doctorId) throw ApiError.notFound("Leave day not found");
  await prisma.leaveDay.delete({ where: { id: leaveId } });
}

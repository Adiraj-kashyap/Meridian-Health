import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/apiError";

export interface SlotCandidate {
  start: Date;
  end: Date;
  available: boolean;
}

/**
 * Computes every candidate slot for a doctor on a given calendar date from
 * their recurring WorkingHour row, then marks each as available/unavailable
 * against LeaveDay and existing Appointment rows (HELD-but-not-expired or
 * CONFIRMED). This is read-only and advisory — the actual booking call
 * re-validates inside a transaction, so a slot shown as "available" here can
 * still be legitimately rejected if another patient wins the race.
 */
export async function getAvailableSlots(doctorId: string, dateStr: string): Promise<SlotCandidate[]> {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest("Invalid date, expected YYYY-MM-DD");

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: { workingHours: true },
  });
  if (!doctor || !doctor.isActive) throw ApiError.notFound("Doctor not found");

  const dayOfWeek = date.getUTCDay();
  const workingHour = doctor.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
  if (!workingHour) return [];

  const leave = await prisma.leaveDay.findUnique({
    where: { doctorId_date: { doctorId, date } },
  });
  if (leave) return [];

  const dayStart = new Date(date);
  const dayEnd = new Date(date);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const existing = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStart: { gte: dayStart, lt: dayEnd },
      OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: new Date() } }],
    },
    select: { slotStart: true },
  });
  const takenTimes = new Set(existing.map((a) => a.slotStart.getTime()));

  const slots: SlotCandidate[] = [];
  const [startH, startM] = workingHour.startTime.split(":").map(Number);
  const [endH, endM] = workingHour.endTime.split(":").map(Number);
  const duration = doctor.slotDurationMinutes;

  let cursor = new Date(date);
  cursor.setUTCHours(startH, startM, 0, 0);
  const end = new Date(date);
  end.setUTCHours(endH, endM, 0, 0);

  while (cursor.getTime() + duration * 60_000 <= end.getTime()) {
    const slotEnd = new Date(cursor.getTime() + duration * 60_000);
    slots.push({
      start: new Date(cursor),
      end: slotEnd,
      available: !takenTimes.has(cursor.getTime()) && cursor.getTime() > Date.now(),
    });
    cursor = slotEnd;
  }

  return slots;
}

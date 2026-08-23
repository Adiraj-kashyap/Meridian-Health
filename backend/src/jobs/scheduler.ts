import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { processNotificationQueue, queueNotification } from "../modules/notifications/notification.service";

/** Sweeps expired HELD appointments. holdSlot() already reclaims a specific
 *  expired slot opportunistically when someone else wants it, but without
 *  this sweep an expired hold nobody re-requests would sit HELD forever and
 *  clutter doctor schedules/patient history. */
async function cleanupExpiredHolds() {
  const { count } = await prisma.appointment.deleteMany({
    where: { status: "HELD", holdExpiresAt: { lt: new Date() } },
  });
  if (count > 0) logger.info(`Cleaned up ${count} expired slot hold(s)`);
}

/** Converts due MedicationReminder rows into queued email notifications. */
async function dispatchMedicationReminders() {
  const due = await prisma.medicationReminder.findMany({
    where: { sent: false, scheduledAt: { lte: new Date() } },
    include: {
      appointment: { include: { patient: { include: { user: true } } } },
    },
    take: 100,
  });

  for (const reminder of due) {
    await queueNotification({
      userId: reminder.appointment.patient.userId,
      appointmentId: reminder.appointmentId,
      type: "MEDICATION_REMINDER",
      subject: `Medication reminder: ${reminder.medication}`,
      body: `Hi ${reminder.appointment.patient.user.name}, it's time to take your medication: ${reminder.medication}${reminder.dosage ? ` (${reminder.dosage})` : ""}.`,
    });
    await prisma.medicationReminder.update({ where: { id: reminder.id }, data: { sent: true, sentAt: new Date() } });
  }
  if (due.length > 0) logger.info(`Dispatched ${due.length} medication reminder(s) to the notification queue`);
}

export function startBackgroundJobs() {
  // Every minute: drain the email retry/send queue — this is where booking
  // confirmations, reminders, and cancellations actually go out, and where
  // a previously-failed send gets another attempt per its backoff schedule.
  cron.schedule("* * * * *", () => {
    processNotificationQueue().catch((err) => logger.error("Notification queue processing failed", err));
  });

  // Every minute: turn due medication reminders into queued notifications.
  cron.schedule("* * * * *", () => {
    dispatchMedicationReminders().catch((err) => logger.error("Medication reminder dispatch failed", err));
  });

  // Every 5 minutes: reclaim expired slot holds.
  cron.schedule("*/5 * * * *", () => {
    cleanupExpiredHolds().catch((err) => logger.error("Expired hold cleanup failed", err));
  });

  logger.info("Background jobs scheduled: notification queue (1m), medication reminders (1m), hold cleanup (5m)");
}

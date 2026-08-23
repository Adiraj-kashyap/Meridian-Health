import { NotificationType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { sendEmail } from "./email.service";
import { logger } from "../../lib/logger";

const BACKOFF_MINUTES = [1, 5, 15, 60, 240]; // attempt 1..5 retry delays

/** Enqueues a notification row rather than sending inline, so a slow or
 *  down email provider never blocks the request that triggered it (booking,
 *  cancellation, etc.) — the background job in src/jobs drains this queue. */
export async function queueNotification(input: {
  userId: string;
  appointmentId?: string;
  type: NotificationType;
  subject: string;
  body: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      appointmentId: input.appointmentId,
      type: input.type,
      subject: input.subject,
      body: input.body,
    },
  });
}

/** Drains due notifications with exponential backoff on failure. Designed
 *  to be called repeatedly by a cron tick — see src/jobs/scheduler.ts. */
export async function processNotificationQueue(batchSize = 20) {
  const due = await prisma.notification.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
    include: { user: true },
    take: batchSize,
    orderBy: { nextAttemptAt: "asc" },
  });

  let sent = 0;
  let failed = 0;

  for (const n of due) {
    try {
      await sendEmail(n.user.email, n.subject, n.body);
      await prisma.notification.update({
        where: { id: n.id },
        data: { status: "SENT", sentAt: new Date(), attempts: n.attempts + 1 },
      });
      sent++;
    } catch (err) {
      const attempts = n.attempts + 1;
      const exhausted = attempts >= n.maxAttempts;
      const delayMin = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          attempts,
          status: exhausted ? "ABANDONED" : "PENDING",
          nextAttemptAt: new Date(Date.now() + delayMin * 60_000),
          lastError: err instanceof Error ? err.message : String(err),
        },
      });
      failed++;
      logger.warn(`Notification ${n.id} delivery failed (attempt ${attempts}/${n.maxAttempts})`, err);
    }
  }

  return { checked: due.length, sent, failed };
}

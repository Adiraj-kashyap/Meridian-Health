import nodemailer, { Transporter } from "nodemailer";
import { env, isEmailConfigured } from "../../config/env";
import { logger } from "../../lib/logger";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

/**
 * Sends one email. Throws on failure — callers (the notification retry
 * queue) are responsible for catching, logging, and rescheduling. Returning
 * a boolean instead of throwing would let a caller silently ignore a real
 * delivery failure, which is exactly what the brief's reliability
 * requirement asks us to avoid.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    // No SMTP configured — this is a valid deployment state (e.g. local dev),
    // not a bug, so we log instead of throwing and let the notification stay
    // queued rather than mark itself permanently failed.
    logger.warn("SMTP not configured — email not sent", { to, subject });
    throw new Error("SMTP is not configured");
  }
  await t.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text: body,
    html: `<pre style="font-family: inherit; white-space: pre-wrap;">${escapeHtml(body)}</pre>`,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

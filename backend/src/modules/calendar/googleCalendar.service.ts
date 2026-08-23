import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../lib/prisma";
import { env, isGoogleConfigured } from "../../config/env";
import { logger } from "../../lib/logger";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function getOAuthClient(): OAuth2Client | null {
  if (!isGoogleConfigured()) return null;
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

export function isCalendarConfigured() {
  return isGoogleConfigured();
}

export function getAuthUrl(state: string): string {
  const client = getOAuthClient();
  if (!client) throw new Error("Google Calendar is not configured on this server");
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function handleOAuthCallback(userId: string, code: string) {
  const client = getOAuthClient();
  if (!client) throw new Error("Google Calendar is not configured on this server");
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error("Google did not return the expected token set (did you request offline access?)");
  }
  await prisma.googleToken.upsert({
    where: { userId },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
      scope: tokens.scope ?? SCOPES.join(" "),
    },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
      scope: tokens.scope ?? SCOPES.join(" "),
    },
  });
}

async function getAuthedClientForUser(userId: string): Promise<OAuth2Client | null> {
  const client = getOAuthClient();
  if (!client) return null;
  const stored = await prisma.googleToken.findUnique({ where: { userId } });
  if (!stored) return null;
  client.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    expiry_date: stored.expiryDate.getTime(),
  });
  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.googleToken.update({
        where: { userId },
        data: {
          accessToken: tokens.access_token,
          ...(tokens.expiry_date ? { expiryDate: new Date(tokens.expiry_date) } : {}),
        },
      });
    }
  });
  return client;
}

interface EventInput {
  summary: string;
  description: string;
  start: Date;
  end: Date;
  attendeeEmail: string;
}

/** Creates a calendar event for one user if they've connected Google
 *  Calendar; returns null (never throws) if they haven't, or if the API
 *  call fails — calendar sync is a nice-to-have layered on top of the
 *  booking, never a reason to fail the booking itself. */
async function createEventForUser(userId: string, input: EventInput): Promise<string | null> {
  try {
    const auth = await getAuthedClientForUser(userId);
    if (!auth) return null;
    const calendar = google.calendar({ version: "v3", auth });
    const { data } = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start.toISOString() },
        end: { dateTime: input.end.toISOString() },
        attendees: [{ email: input.attendeeEmail }],
        reminders: { useDefault: true },
      },
    });
    return data.id ?? null;
  } catch (err) {
    logger.warn(`Google Calendar event creation failed for user ${userId}`, err);
    return null;
  }
}

async function updateEventForUser(userId: string, eventId: string, input: EventInput): Promise<boolean> {
  try {
    const auth = await getAuthedClientForUser(userId);
    if (!auth) return false;
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start.toISOString() },
        end: { dateTime: input.end.toISOString() },
        attendees: [{ email: input.attendeeEmail }],
      },
    });
    return true;
  } catch (err) {
    logger.warn(`Google Calendar event update failed for user ${userId}`, err);
    return false;
  }
}

async function deleteEventForUser(userId: string, eventId: string): Promise<void> {
  try {
    const auth = await getAuthedClientForUser(userId);
    if (!auth) return;
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: "primary", eventId });
  } catch (err) {
    logger.warn(`Google Calendar event deletion failed for user ${userId}`, err);
  }
}

/** Creates matching calendar events for both patient and doctor when an
 *  appointment is confirmed. Stores the resulting event ids on the
 *  appointment so they can be updated/deleted later. */
export async function createCalendarEventsForAppointment(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });
  if (!appt) return;

  const summary = `Appointment: ${appt.patient.user.name} with Dr. ${appt.doctor.user.name}`;
  const description = `Specialization: ${appt.doctor.specialization}\nBooked via Healthcare Appointment Manager.`;

  const [patientEventId, doctorEventId] = await Promise.all([
    createEventForUser(appt.patient.userId, {
      summary,
      description,
      start: appt.slotStart,
      end: appt.slotEnd,
      attendeeEmail: appt.doctor.user.email,
    }),
    createEventForUser(appt.doctor.userId, {
      summary,
      description,
      start: appt.slotStart,
      end: appt.slotEnd,
      attendeeEmail: appt.patient.user.email,
    }),
  ]);

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { googleEventIdPatient: patientEventId, googleEventIdDoctor: doctorEventId },
  });
}

export async function updateCalendarEventsForAppointment(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
  });
  if (!appt) return;

  const summary = `Appointment: ${appt.patient.user.name} with Dr. ${appt.doctor.user.name} (Rescheduled)`;
  const description = `Specialization: ${appt.doctor.specialization}\nBooked via Healthcare Appointment Manager.`;

  if (appt.googleEventIdPatient) {
    await updateEventForUser(appt.patient.userId, appt.googleEventIdPatient, {
      summary,
      description,
      start: appt.slotStart,
      end: appt.slotEnd,
      attendeeEmail: appt.doctor.user.email,
    });
  }
  if (appt.googleEventIdDoctor) {
    await updateEventForUser(appt.doctor.userId, appt.googleEventIdDoctor, {
      summary,
      description,
      start: appt.slotStart,
      end: appt.slotEnd,
      attendeeEmail: appt.patient.user.email,
    });
  }
}

export async function deleteCalendarEventsForAppointment(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, doctor: true },
  });
  if (!appt) return;

  if (appt.googleEventIdPatient) await deleteEventForUser(appt.patient.userId, appt.googleEventIdPatient);
  if (appt.googleEventIdDoctor) await deleteEventForUser(appt.doctor.userId, appt.googleEventIdDoctor);

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { googleEventIdPatient: null, googleEventIdDoctor: null },
  });
}

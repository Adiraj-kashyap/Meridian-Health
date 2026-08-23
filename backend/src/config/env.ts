import "dotenv/config";
import { z } from "zod";

// z.coerce.boolean() just calls JS Boolean(value), so the literal string
// "false" from a .env file (which is always a non-empty string) coerces to
// `true`. This parses the actual text instead.
const booleanString = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? defaultValue : ["true", "1", "yes"].includes(v.toLowerCase())));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  // LLM (Google Gemini) — optional at boot so the server still starts; every
  // call site handles a missing key as a graceful-degradation path.
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  LLM_MAX_RETRIES: z.coerce.number().default(2),

  // Email (SMTP via Nodemailer — works with SendGrid, Mailgun, Gmail, Mailtrap)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Healthcare Clinic <no-reply@clinic.local>"),
  SMTP_SECURE: booleanString(false),

  // Google Calendar OAuth 2.0
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // Booking engine tuning
  SLOT_HOLD_MINUTES: z.coerce.number().default(5),
  APPOINTMENT_REMINDER_HOURS_BEFORE: z.coerce.number().default(24),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isLlmConfigured = () => Boolean(env.GEMINI_API_KEY);
export const isEmailConfigured = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
export const isGoogleConfigured = () =>
  Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);

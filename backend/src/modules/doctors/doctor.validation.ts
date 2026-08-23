import { z } from "zod";

export const createDoctorSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().optional(),
  password: z.string().min(8).optional(), // if omitted, a temp password is generated
  specialization: z.string().min(2),
  bio: z.string().optional(),
  qualifications: z.string().optional(),
  slotDurationMinutes: z.coerce.number().int().min(5).max(180).default(30),
  consultationFee: z.coerce.number().nonnegative().optional(),
});

export const updateDoctorSchema = z.object({
  specialization: z.string().min(2).optional(),
  bio: z.string().optional(),
  qualifications: z.string().optional(),
  slotDurationMinutes: z.coerce.number().int().min(5).max(180).optional(),
  consultationFee: z.coerce.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const workingHoursSchema = z.object({
  hours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(timeRegex, "Expected HH:mm"),
        endTime: z.string().regex(timeRegex, "Expected HH:mm"),
      })
    )
    .refine((hours) => hours.every((h) => h.startTime < h.endTime), {
      message: "startTime must be before endTime for every entry",
    }),
});

export const leaveDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  reason: z.string().optional(),
});

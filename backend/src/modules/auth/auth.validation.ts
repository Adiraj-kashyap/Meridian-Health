import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(["PATIENT", "DOCTOR"]).default("PATIENT"),
  // Doctor-only fields, required when role === "DOCTOR"
  specialization: z.string().optional(),
  bio: z.string().optional(),
  slotDurationMinutes: z.coerce.number().int().min(5).max(180).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

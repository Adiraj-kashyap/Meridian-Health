import { z } from "zod";

export const holdSlotSchema = z.object({
  doctorId: z.string().uuid(),
  slotStart: z.string().datetime({ message: "slotStart must be an ISO 8601 datetime" }),
});

export const symptomFormSchema = z.object({
  symptomsText: z.string().min(10, "Please describe symptoms in a bit more detail"),
  durationDays: z.coerce.number().int().nonnegative().optional(),
  severitySelfRating: z.coerce.number().int().min(1).max(10).optional(),
});

export const rescheduleSchema = z.object({
  slotStart: z.string().datetime(),
});

export const cancelSchema = z.object({
  reason: z.string().optional(),
});

export const prescriptionItemSchema = z.object({
  medication: z.string().min(1),
  dosage: z.string().optional(),
  frequencyPerDay: z.coerce.number().int().min(1).max(12),
  durationDays: z.coerce.number().int().min(1).max(365),
  instructions: z.string().optional(),
});

export const visitNoteSchema = z.object({
  clinicalNotes: z.string().min(10),
  diagnosis: z.string().optional(),
  prescription: z.array(prescriptionItemSchema).default([]),
});

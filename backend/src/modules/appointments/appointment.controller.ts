import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";
import * as svc from "./appointment.service";
import * as visitSvc from "../visits/visit.service";
import { holdSlotSchema, symptomFormSchema, rescheduleSchema, cancelSchema, visitNoteSchema } from "./appointment.validation";

export const holdSlotHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const input = holdSlotSchema.parse(req.body);
  const appt = await svc.holdSlot(req.auth.userId, input.doctorId, input.slotStart);
  res.status(201).json(appt);
});

export const submitSymptomsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const input = symptomFormSchema.parse(req.body);
  const form = await svc.submitSymptoms(req.params.id, req.auth.userId, input);
  res.json(form);
});

export const retrySymptomLlmHandler = asyncHandler(async (req: Request, res: Response) => {
  const form = await svc.retryPreVisitLlm(req.params.id);
  res.json(form);
});

export const confirmAppointmentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const appt = await svc.confirmAppointment(req.params.id, req.auth.userId);
  res.json(appt);
});

export const cancelAppointmentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const input = cancelSchema.parse(req.body ?? {});
  const appt = await svc.cancelAppointment(req.params.id, req.auth.userId, req.auth.role, input.reason);
  res.json(appt);
});

export const rescheduleAppointmentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const input = rescheduleSchema.parse(req.body);
  const appt = await svc.rescheduleAppointment(req.params.id, req.auth.userId, input.slotStart);
  res.json(appt);
});

export const myAppointmentsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const appts = await svc.getMyAppointments(req.auth.userId, req.auth.role);
  res.json(appts);
});

export const getAppointmentHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const appt = await svc.getAppointmentById(req.params.id, req.auth.userId, req.auth.role);
  res.json(appt);
});

export const submitVisitNoteHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const input = visitNoteSchema.parse(req.body);
  const note = await visitSvc.submitVisitNote(req.params.id, req.auth.userId, input);
  res.status(201).json(note);
});

export const retryVisitLlmHandler = asyncHandler(async (req: Request, res: Response) => {
  const note = await visitSvc.retryPostVisitLlm(req.params.id);
  res.json(note);
});

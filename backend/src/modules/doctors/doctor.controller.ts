import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as svc from "./doctor.service";
import { getAvailableSlots } from "../availability/availability.service";
import { createDoctorSchema, updateDoctorSchema, workingHoursSchema, leaveDaySchema } from "./doctor.validation";
import { ApiError } from "../../utils/apiError";

export const listDoctorsHandler = asyncHandler(async (req: Request, res: Response) => {
  const specialization = typeof req.query.specialization === "string" ? req.query.specialization : undefined;
  res.json(await svc.listDoctors(specialization));
});

export const getDoctorHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await svc.getDoctor(req.params.id));
});

export const getAvailabilityHandler = asyncHandler(async (req: Request, res: Response) => {
  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  if (!date) throw ApiError.badRequest("date query param (YYYY-MM-DD) is required");
  res.json(await getAvailableSlots(req.params.id, date));
});

export const createDoctorHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = createDoctorSchema.parse(req.body);
  const result = await svc.createDoctor(input);
  res.status(201).json(result);
});

export const updateDoctorHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = updateDoctorSchema.parse(req.body);
  res.json(await svc.updateDoctor(req.params.id, input));
});

export const setWorkingHoursHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = workingHoursSchema.parse(req.body);
  res.json(await svc.setWorkingHours(req.params.id, input.hours));
});

export const addLeaveDayHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = leaveDaySchema.parse(req.body);
  res.status(201).json(await svc.addLeaveDay(req.params.id, input.date, input.reason));
});

export const removeLeaveDayHandler = asyncHandler(async (req: Request, res: Response) => {
  await svc.removeLeaveDay(req.params.id, req.params.leaveId);
  res.status(204).send();
});

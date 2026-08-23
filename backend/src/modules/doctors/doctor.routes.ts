import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  listDoctorsHandler,
  getDoctorHandler,
  getAvailabilityHandler,
  createDoctorHandler,
  updateDoctorHandler,
  setWorkingHoursHandler,
  addLeaveDayHandler,
  removeLeaveDayHandler,
} from "./doctor.controller";

// Public + patient-facing doctor browsing
export const doctorRouter = Router();
doctorRouter.get("/", listDoctorsHandler);
doctorRouter.get("/:id", getDoctorHandler);
doctorRouter.get("/:id/availability", getAvailabilityHandler);

// Admin-only doctor management
export const adminDoctorRouter = Router();
adminDoctorRouter.use(requireAuth, requireRole("ADMIN"));
adminDoctorRouter.post("/", createDoctorHandler);
adminDoctorRouter.patch("/:id", updateDoctorHandler);
adminDoctorRouter.put("/:id/working-hours", setWorkingHoursHandler);
adminDoctorRouter.post("/:id/leave", addLeaveDayHandler);
adminDoctorRouter.delete("/:id/leave/:leaveId", removeLeaveDayHandler);

import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  holdSlotHandler,
  submitSymptomsHandler,
  retrySymptomLlmHandler,
  confirmAppointmentHandler,
  cancelAppointmentHandler,
  rescheduleAppointmentHandler,
  myAppointmentsHandler,
  getAppointmentHandler,
  submitVisitNoteHandler,
  retryVisitLlmHandler,
} from "./appointment.controller";

const router = Router();
router.use(requireAuth);

router.post("/hold", requireRole("PATIENT"), holdSlotHandler);
router.get("/me", myAppointmentsHandler);
router.get("/:id", getAppointmentHandler);
router.post("/:id/symptoms", requireRole("PATIENT"), submitSymptomsHandler);
router.post("/:id/symptoms/retry-llm", requireRole("PATIENT", "DOCTOR"), retrySymptomLlmHandler);
router.post("/:id/confirm", requireRole("PATIENT"), confirmAppointmentHandler);
router.post("/:id/cancel", cancelAppointmentHandler);
router.post("/:id/reschedule", requireRole("PATIENT"), rescheduleAppointmentHandler);
router.post("/:id/visit-notes", requireRole("DOCTOR"), submitVisitNoteHandler);
router.post("/:id/visit-notes/retry-llm", requireRole("DOCTOR"), retryVisitLlmHandler);

export default router;

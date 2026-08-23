import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { adminDoctorRouter } from "../doctors/doctor.routes";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.use("/doctors", adminDoctorRouter);

// Lightweight oversight endpoint: every appointment across the clinic.
router.get(
  "/appointments",
  asyncHandler(async (_req, res) => {
    const appts = await prisma.appointment.findMany({
      include: {
        patient: { include: { user: { select: { name: true, email: true } } } },
        doctor: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { slotStart: "desc" },
      take: 200,
    });
    res.json(appts);
  })
);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [doctors, patients, appointments, pendingNotifications] = await Promise.all([
      prisma.doctorProfile.count({ where: { isActive: true } }),
      prisma.patientProfile.count(),
      prisma.appointment.count(),
      prisma.notification.count({ where: { status: "PENDING" } }),
    ]);
    res.json({ doctors, patients, appointments, pendingNotifications });
  })
);

export default router;

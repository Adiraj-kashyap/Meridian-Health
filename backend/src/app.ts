import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import { doctorRouter } from "./modules/doctors/doctor.routes";
import appointmentRoutes from "./modules/appointments/appointment.routes";
import adminRoutes from "./modules/admin/admin.routes";
import calendarRoutes from "./modules/calendar/calendar.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

// Auth endpoints get a tighter limit to blunt credential-stuffing attempts.
app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, max: 30 }));
app.use("/api", rateLimit({ windowMs: 60_000, max: 300 }));

app.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRouter);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/calendar", calendarRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

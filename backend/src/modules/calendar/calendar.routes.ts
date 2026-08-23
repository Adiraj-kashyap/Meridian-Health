import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";
import { getAuthUrl, handleOAuthCallback, isCalendarConfigured } from "./googleCalendar.service";
import { signToken } from "../../middleware/auth";
import { env } from "../../config/env";
import jwt from "jsonwebtoken";

const router = Router();

// Returns the Google consent URL the frontend should redirect the browser to.
// `state` carries a short-lived JWT so the callback (which Google calls
// directly, without our normal Authorization header) can identify the user.
router.get(
  "/connect",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isCalendarConfigured()) throw ApiError.badRequest("Google Calendar is not configured on this server");
    const state = signToken({ userId: req.auth!.userId, role: req.auth!.role, email: req.auth!.email });
    res.json({ url: getAuthUrl(state) });
  })
);

router.get(
  "/oauth/callback",
  asyncHandler(async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    if (!code || !state) throw ApiError.badRequest("Missing code or state from Google");

    let userId: string;
    try {
      const payload = jwt.verify(state, env.JWT_SECRET) as { userId: string };
      userId = payload.userId;
    } catch {
      throw ApiError.unauthorized("Invalid or expired OAuth state");
    }

    await handleOAuthCallback(userId, code);
    res.redirect(`${env.FRONTEND_URL}/app/settings?calendar=connected`);
  })
);

router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { prisma } = await import("../../lib/prisma");
    const token = await prisma.googleToken.findUnique({ where: { userId: req.auth!.userId } });
    res.json({ connected: Boolean(token), configured: isCalendarConfigured() });
  })
);

export default router;

import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ApiError } from "../utils/apiError";
import { logger } from "../lib/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `No route: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error(err.message, err.details);
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint violation — this is the last line of defense
    // against double-booking when two requests race past the app-level check.
    if (err.code === "P2002") {
      return res.status(409).json({
        error: "This slot was just taken by another booking. Please choose a different time.",
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
    logger.error("Prisma error", { code: err.code, meta: err.meta });
    return res.status(500).json({ error: "Database error" });
  }

  logger.error("Unhandled error", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  return res.status(500).json({ error: process.env.NODE_ENV === "production" ? "Internal server error" : message });
}

import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { registerSchema, loginSchema } from "./auth.validation";
import * as authService from "./auth.service";
import { ApiError } from "../../utils/apiError";

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  res.status(201).json(result);
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.status(200).json(result);
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized();
  const profile = await authService.getProfile(req.auth.userId);
  res.json(profile);
});

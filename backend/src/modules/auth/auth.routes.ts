import { Router } from "express";
import { registerHandler, loginHandler, meHandler } from "./auth.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.get("/me", requireAuth, meHandler);

export default router;

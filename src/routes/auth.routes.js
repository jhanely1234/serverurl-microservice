import express from "express";
import {
  login,
  verifyCodeHandler,
  forgotPasswordHandler,
  resetPasswordHandler
} from "../controllers/auth.controller.js";
import { checkAuth } from "../middlewares/auth.middlleware.js";
import { getMe, createUser } from "../controllers/paciente.controller.js";
const router = express.Router();

router.post("/login", login);
router.post("/verify-code", verifyCodeHandler);
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);

router.get("/me", checkAuth, getMe);

router.post("/register", createUser);

export default router;

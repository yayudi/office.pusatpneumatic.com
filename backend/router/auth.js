// backend/router/auth.js
import express from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../validators/authValidator.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Batasi 5 percobaan gagal
  message: { success: false, message: "Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

// LOGIN
router.post("/login", loginLimiter, validate(loginSchema), authController.login);

// LOGOUT
router.post("/logout", authController.logout);

export default router;

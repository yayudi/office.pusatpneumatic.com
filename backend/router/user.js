// backend/router/user.js
import express from "express";
import * as userController from "../controllers/userController.js";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema } from "../validators/userValidator.js";

const router = express.Router();

// GET /user/profile
router.get("/profile", userController.getProfile);

// PUT /user/profile
router.put("/profile", validate(updateProfileSchema), userController.updateProfile);

/**
 * GET /api/user/my-locations
 * Mengambil semua lokasi yang diizinkan untuk pengguna yang sedang login.
 */
router.get("/my-locations", userController.getMyLocations);

export default router;

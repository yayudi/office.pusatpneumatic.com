// backend/router/admin.js
import express from "express";
import * as adminController from "../controllers/adminController.js";

const router = express.Router();

// GET  /api/admin/users          - Mendapatkan semua user
router.get("/", adminController.getUsers);

// POST /api/admin/users          - Membuat user baru
router.post("/", adminController.createUser);

// GET  /api/admin/users/roles    - Mendapatkan semua role
router.get("/roles", adminController.getRoles);

// PUT  /api/admin/users/:id      - Update data user
router.put("/:id", adminController.updateUser);

// DELETE /api/admin/users/:id    - Soft delete user
router.delete("/:id", adminController.deleteUser);

// GET  /api/admin/users/:id/locations  - Mengambil lokasi user
router.get("/:id/locations", adminController.getUserLocations);

// PUT  /api/admin/users/:id/locations  - Update lokasi user
router.put("/:id/locations", adminController.updateUserLocations);

export default router;

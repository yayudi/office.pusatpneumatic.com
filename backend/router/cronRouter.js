// backend/router/cronRouter.js
import express from "express";
import { canAccess } from "../middleware/permissionMiddleware.js";
import * as jobController from "../controllers/jobController.js";

const router = express.Router();

/**
 * Endpoint untuk memicu tugas latar belakang secara manual.
 * Ini bertindak sebagai "Producer" yang membuat job baru di antrian.
 * Dilindungi oleh izin 'trigger-sync'.
 */
router.post("/trigger/:task", canAccess("trigger-sync"), jobController.triggerJob);

export default router;

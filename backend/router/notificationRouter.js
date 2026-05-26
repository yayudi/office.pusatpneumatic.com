import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();

// /api/notifications/recent
router.get("/recent", notificationController.getRecentUnread);

// /api/notifications/preferences
router.get("/preferences", notificationController.getPreferences);
router.post("/preferences", notificationController.updatePreferences);

// /api/notifications/:id/read
router.put("/:id/read", notificationController.markAsRead);

// /api/notifications
router.get("/", notificationController.getAll);

export default router;

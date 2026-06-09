import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();
import { validate } from "../middleware/validate.js";
import { updatePreferencesSchema } from "../validators/notificationValidator.js";

// /api/notifications/recent
router.get("/recent", notificationController.getRecentUnread);

// /api/notifications/preferences
router.get("/preferences", notificationController.getPreferences);
router.post("/preferences", validate(updatePreferencesSchema), notificationController.updatePreferences);

// /api/notifications/:id/read
router.put("/:id/read", notificationController.markAsRead);

// /api/notifications
router.get("/", notificationController.getAll);

export default router;

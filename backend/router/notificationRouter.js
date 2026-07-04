import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();
import { validate } from "../middleware/validate.js";
import { updatePreferencesSchema } from "../validators/notificationValidator.js";

// /api/notifications/recent
router.get("/recent", notificationController.getRecentPending);

// /api/notifications/preferences
router.get("/preferences", notificationController.getPreferences);
router.put("/preferences", validate(updatePreferencesSchema), notificationController.updatePreferences);

// /api/notifications/:id/done
router.put("/:id/done", notificationController.markAsDone);

// /api/notifications/:id/claim
router.put("/:id/claim", notificationController.claimNotification);

// /api/notifications
router.get("/", notificationController.getAll);

export default router;

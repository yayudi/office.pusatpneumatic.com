import { Router } from "express";
import {
  getAllTemplates,
  createTemplate,
  deleteTemplate,
  updateTemplate
} from "../controllers/stickerTemplateController.js";
import { canAccess } from "../middleware/permissionMiddleware.js";

const router = Router();
import { validate } from "../middleware/validate.js";
import { stickerTemplateSchema } from "../validators/stickerTemplateValidator.js";

// Get all templates
router.get("/", getAllTemplates);

// Create new template (admin only, based on user rule 'di sticker generator, pastikan permission delete nya hanya untuk admin', but creating might also be restricted if needed. We'll leave create open to authenticated users for now or also restrict)
// Actually, let's keep create open or just for those who can access sticker generator. 
// The rule was "pastikan permission delete nya hanya untuk admin".
router.post("/", validate(stickerTemplateSchema), createTemplate);

// Delete template (only admin or users with manage-users/manage-roles permission)
// Based on existing conventions, "manage-users" usually denotes admin level.
router.delete("/:id", canAccess("manage-users"), deleteTemplate);

// Update template
router.put("/:id", validate(stickerTemplateSchema), updateTemplate);

export default router;

import express from "express";
import * as mediaController from "../controllers/mediaController.js";
import uploadExcel from "../middleware/uploadMiddleware.js";

const router = express.Router();
import { validate } from "../middleware/validate.js";
import { updateTagsSchema, updateTitleSchema } from "../validators/mediaValidator.js";

// Media Routes
router.get("/", mediaController.listMedia);
router.get("/status", mediaController.getMediaStatus);
router.get("/bulk-link-template", mediaController.downloadBulkLinkTemplate);
router.get("/:id", mediaController.getMediaById);

// Cloudflare R2 Direct Upload Routes
router.post("/presigned-url", mediaController.getPresignedUrls);
router.post("/confirm", mediaController.confirmUpload);

router.post("/bulk-link-excel", uploadExcel.single("file"), mediaController.bulkLinkMediaExcel);
router.delete("/:id", mediaController.deleteMedia);
router.put("/:id/tags", validate(updateTagsSchema), mediaController.updateMediaTagsController);
router.put("/:id/title", validate(updateTitleSchema), mediaController.updateMediaTitleController);

export default router;

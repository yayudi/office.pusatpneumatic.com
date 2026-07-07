import express from "express";
import multer from "multer";
import * as mediaController from "../controllers/mediaController.js";
import uploadExcel from "../middleware/uploadMiddleware.js";

const router = express.Router();
import { validate } from "../middleware/validate.js";
import { updateTagsSchema, updateTitleSchema } from "../validators/mediaValidator.js";
import { isAllowedMimeType } from "../utils/mediaUtils.js";
import { createDiskStorage } from "../utils/multerUtils.js";

const tempUploadDir = "uploads/temp/";
const storage = createDiskStorage(tempUploadDir, "raw");

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per image
  fileFilter: (req, file, cb) => {
    if (isAllowedMimeType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format gambar tidak didukung! Hanya JPEG, PNG, WEBP, GIF, dan AVIF."), false);
    }
  }
});

// Media Routes
router.get("/", mediaController.listMedia);
router.get("/status", mediaController.getMediaStatus);
router.get("/bulk-link-template", mediaController.downloadBulkLinkTemplate);
router.get("/:id", mediaController.getMediaById);
router.post("/upload", upload.array("images", 20), mediaController.uploadMedia);
router.post("/bulk-link-excel", uploadExcel.single("file"), mediaController.bulkLinkMediaExcel);
router.delete("/:id", mediaController.deleteMedia);
router.put("/:id/tags", validate(updateTagsSchema), mediaController.updateMediaTagsController);
router.put("/:id/title", validate(updateTitleSchema), mediaController.updateMediaTitleController);

export default router;

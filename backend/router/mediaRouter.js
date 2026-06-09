import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as mediaController from "../controllers/mediaController.js";
import Logger from "../utils/logger.js";

const router = express.Router();
import { validate } from "../middleware/validate.js";
import { updateTagsSchema, updateTitleSchema } from "../validators/mediaValidator.js";

// Setup Multer for raw uploads before processing via Pustaka Media worker
const tempUploadDir = "uploads/temp/";
if (!fs.existsSync(tempUploadDir)) {
  try {
    fs.mkdirSync(tempUploadDir, { recursive: true });
    Logger.info(`Temp folder created: ${tempUploadDir}`, "MEDIA_ROUTER");
  } catch (err) {
    Logger.error(`Failed to create folder ${tempUploadDir}`, err, "MEDIA_ROUTER");
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "raw-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per image
});

// Media Routes
router.get("/", mediaController.listMedia);
router.get("/status", mediaController.getMediaStatus);
router.get("/:id", mediaController.getMediaById);
router.post("/upload", upload.array("images", 20), mediaController.uploadMedia);
router.delete("/:id", mediaController.deleteMedia);
router.put("/:id/tags", validate(updateTagsSchema), mediaController.updateMediaTagsController);
router.put("/:id/title", validate(updateTitleSchema), mediaController.updateMediaTitleController);

export default router;

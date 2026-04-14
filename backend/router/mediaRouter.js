import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { canAccess } from "../middleware/permissionMiddleware.js";
import * as mediaController from "../controllers/mediaController.js";

const router = express.Router();

// Setup Multer for raw uploads before processing via Pustaka Media worker
const tempUploadDir = "uploads/temp/";
if (!fs.existsSync(tempUploadDir)) {
  try {
    fs.mkdirSync(tempUploadDir, { recursive: true });
    console.log(`[Media] Temp folder created: ${tempUploadDir}`);
  } catch (err) {
    console.error(`[Media] Failed to create folder ${tempUploadDir}:`, err);
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
router.put("/:id/tags", mediaController.updateMediaTagsController);

export default router;

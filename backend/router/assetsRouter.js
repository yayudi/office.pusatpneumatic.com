// backend\router\assetsRouter.js
import express from "express";
import path from "path";
import fs from "fs";
import mime from "mime-types";
import { fileURLToPath } from "url";
import Logger from "../utils/logger.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsPath = path.resolve(__dirname, "..", "assets");

// Buat "catch-all" route untuk menangani semua request file statis
router.get("*", (req, res, next) => {
  const requestedPath = path.join(assetsPath, req.path);

  // Keamanan: Pastikan path yang diminta tidak mencoba keluar dari folder 'assets'
  if (!requestedPath.startsWith(assetsPath)) {
    return res.status(403).send("Forbidden");
  }

  // [FIX] Gunakan fs.stat untuk cek file vs directory — mencegah EISDIR crash
  fs.stat(requestedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Path tidak ada atau adalah directory, lanjut ke 404 handler
      return next();
    }

    const contentType = mime.lookup(requestedPath) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // Aman untuk stream karena sudah dipastikan ini file
    const stream = fs.createReadStream(requestedPath);
    stream.on("error", (streamErr) => {
      Logger.error("Stream error", streamErr, "ASSETS_ROUTER");
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
    });
    stream.pipe(res);
  });
});

export default router;

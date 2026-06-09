// backend\server.js
import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "./config/db.js";
import Logger from "./utils/logger.js";
import jwt from "jsonwebtoken";

import apiRouter from "./router/index.js";
import assetsRouter from "./router/assetsRouter.js";
import AppError from "./utils/AppError.js";

import errorHandler from "./middleware/errorHandler.js";

import helmet from "helmet";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ==================================================================
// Keamanan API (Helmet)
// ==================================================================
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Izinkan frontend memuat gambar dari /uploads
  }),
);

// Enable Trust Proxy for Reverse Proxies (Cloudflare/Nginx)
// Ensure req.protocol detects 'https' correctly
app.set("trust proxy", true);

// ==================================================================
// Konfigurasi CORS Permissive
// ==================================================================
// Mengatasi masalah "CORS request did not succeed" di Shared Hosting.
// Kita menggunakan strategi "Reflect Origin" (callback null, true) yang
// mengizinkan browser apapun untuk connect, selama credentials match.
const corsOptions = {
  origin: function (origin, callback) {
    // Selalu izinkan origin apapun.
    // Ini diperlukan jika whitelist strict (string match) gagal karena protokol http/https
    // atau trailing slash.
    callback(null, true);
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  credentials: true, // Wajib true agar cookies/auth header dikirim
  allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept",
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle Preflight (OPTIONS) requests
app.use(express.json());

// ==================================================================
// Middleware Logger untuk Download
// ==================================================================
// Mencatat request download file untuk memastikan file ada di disk.
app.use("/uploads", (req, res, next) => {
  try {
    const requestedPath = req.path;
    const safePath = decodeURIComponent(requestedPath);
    const absolutePath = path.join(__dirname, "uploads", safePath);

    let fileStatus = "MISSING (File tidak ditemukan di disk)";
    let fileSize = 0;

    if (fs.existsSync(absolutePath)) {
      const stats = fs.statSync(absolutePath);
      fileSize = stats.size;
      fileStatus = `FOUND (Size: ${fileSize} bytes)`;
    }

    // Ekstrak identitas user jika token disediakan via URL
    let requestUser = "Anonymous (No Token)";
    if (req.query.token) {
      try {
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        requestUser = decoded.username;
      } catch (err) {
        requestUser = "Invalid/Expired Token";
      }
    }

    Logger.debug(safePath, "DOWNLOAD", {
      status: fileStatus,
      user: requestUser,
      clientIP: req.ip,
    });
  } catch (err) {
    Logger.error("Logger Error", err, "SERVER");
  }
  next();
});

// ==================================================================
// Static File Serving
// ==================================================================
// Melayani file statis dari folder 'uploads'.
// Ditaruh SEBELUM router lain untuk menghindari 404 palsu.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const inlineExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

      if (inlineExtensions.includes(ext)) {
        res.setHeader("Content-Disposition", "inline");
      } else {
        res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
      }

      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    },
  }),
);

// Routing API Utama
app.use("/api", apiRouter);
app.use("/", assetsRouter);

// 404 Handler Global
app.use((req, res, next) => {
  // Hanya log jika bukan request favicon/robots.txt yang annoying
  if (!req.originalUrl.includes("favicon") && !req.originalUrl.includes("robots")) {
    Logger.debug(`URL tidak ditemukan: ${req.originalUrl}`, "404_MISSING");
  }
  next(new AppError("Endpoint tidak ditemukan.", 404, "NOT_FOUND"));
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  Logger.info(`Server backend berjalan di http://localhost:${PORT}`, "SERVER");
  Logger.info(`Serving static uploads from: ${path.join(__dirname, "uploads")}`, "SERVER");
  Logger.info("CORS Policy: Permissive (All Origins Allowed)", "SERVER");
});

// backend\router\index.js
import { Router } from "express";

// Impor semua router Anda
import authRoutes from "./auth.js";
import userRoutes from "./user.js";
import adminRoutes from "./admin.js";
import attendanceRouter from "./attendanceRouter.js";
import productRoutes from "./productRouter.js";
import stockRoutes from "./stockRouter.js";
import stockRequestRoutes from "./stockRequestRouter.js";
import locationRoutes from "./locationRouter.js";
import realtimeRouter from "./realtimeRouter.js";
import roleRoutes from "./roleRouter.js";
import pickingRouter from "./pickingRouter.js";
import returnRouter from "./returnRouter.js";
import statsRouter from "./statsRouter.js";
import reportRouter from "./reportRouter.js";
import packageRoutes from "./packageRouter.js";
import jobRoutes from "./jobRouter.js";
import systemLogRoutes from "./systemLogRouter.js";
import shiftRoutes from "./shiftRouter.js";
import scheduleRoutes from "./scheduleRouter.js";
import mediaRoutes from "./mediaRouter.js";
import statisticRoutes from "./statistics.js";
import changelogRoutes from "./changelogRouter.js";
import categoryRoutes from "./categoryRouter.js";
import salesChannelsRoutes from "./salesChannels.js";
import notificationRoutes from "./notificationRouter.js";
import stickerTemplateRoutes from "./stickerTemplateRouter.js";
import investigationRoutes from "./investigationRouter.js";
import paperSizeRoutes from "./paperSizeRouter.js";
// import cronRouter from "./cronRouter.js";

import AppError from "../utils/AppError.js";

// Impor middleware yang diperlukan
import authenticateToken from "../middleware/authMiddleware.js";
import { canAccess } from "../middleware/permissionMiddleware.js";
import db from "../config/db.js"; // Impor db untuk rute /test
import Logger from "../utils/logger.js";

const apiRouter = Router();

// Daftarkan semua rute API di bawah apiRouter
// Rute-rute ini sekarang akan dipanggil dengan prefix /api
// (misal: /api/auth, /api/products, dll)
apiRouter.use("/auth", authRoutes);
apiRouter.use("/products", authenticateToken, productRoutes);
apiRouter.use("/locations", authenticateToken, locationRoutes);
apiRouter.use("/stock", authenticateToken, stockRoutes);
apiRouter.use("/stock-requests", authenticateToken, stockRequestRoutes);
apiRouter.use("/attendance", authenticateToken, attendanceRouter);
apiRouter.use("/user", authenticateToken, userRoutes);
apiRouter.use("/admin/users", authenticateToken, canAccess("manage-users"), adminRoutes);
apiRouter.use("/admin/roles", authenticateToken, canAccess("manage-roles"), roleRoutes);
apiRouter.use("/realtime", authenticateToken, realtimeRouter);
apiRouter.use("/picking", authenticateToken, pickingRouter);
apiRouter.use("/returns", authenticateToken, returnRouter);
apiRouter.use("/return", authenticateToken, returnRouter);
apiRouter.use("/stats", authenticateToken, statsRouter);
apiRouter.use("/reports", authenticateToken, reportRouter);
apiRouter.use("/packages", authenticateToken, packageRoutes);
apiRouter.use("/jobs", authenticateToken, jobRoutes);
apiRouter.use("/logs", authenticateToken, canAccess("manage-users"), systemLogRoutes);
apiRouter.use("/shifts", authenticateToken, shiftRoutes);
apiRouter.use("/schedules", authenticateToken, scheduleRoutes);
apiRouter.use("/media", authenticateToken, mediaRoutes);
apiRouter.use("/statistics", statisticRoutes);
apiRouter.use("/changelogs", authenticateToken, changelogRoutes);
apiRouter.use("/categories", authenticateToken, categoryRoutes);
apiRouter.use("/sales-channels", salesChannelsRoutes);
apiRouter.use("/notifications", authenticateToken, notificationRoutes);
apiRouter.use("/sticker-templates", authenticateToken, stickerTemplateRoutes);
apiRouter.use("/paper-sizes", paperSizeRoutes); // Authentication handled in router
apiRouter.use("/investigation", authenticateToken, investigationRoutes);
// apiRouter.use("/cron", authenticateToken, cronRouter);

// Rute tes "canary"
apiRouter.get("/test", async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS solution");
    res.status(200).json({
      success: true,
      message: "Koneksi database berhasil!",
      data: rows[0],
    });
  } catch (error) {
    Logger.error("TES KONEKSI DB GAGAL", error, "ROUTER_INDEX");
    next(new AppError(`Gagal terhubung ke database. Detail: ${error.message}`, 500));
  }
});

// Rute health check sederhana untuk /api/
apiRouter.get("/", (req, res) => {
  res.json({ message: "Backend API is healthy" });
});

export default apiRouter;

// backend\router\cronRouter.js
import express from "express";
import { canAccess } from "../middleware/permissionMiddleware.js";
import db from "../config/db.js"; // Impor koneksi database
import Logger from "../utils/logger.js";

const router = express.Router();

/**
 * Endpoint untuk memicu tugas latar belakang secara manual.
 * Ini bertindak sebagai "Producer" yang membuat job baru di antrian.
 * Dilindungi oleh izin 'trigger-sync'.
 */
router.post("/trigger/:task", canAccess("trigger-sync"), async (req, res) => {
  const { task } = req.params;

  // Validasi untuk memastikan hanya tugas yang diizinkan yang bisa dijalankan
  const allowedTasks = ["stock", "holidays"];

  if (!allowedTasks.includes(task)) {
    return res.status(400).json({ success: false, message: "Tugas tidak valid." });
  }

  try {
    // Cukup masukkan tugas baru ke dalam tabel 'jobs' dengan status 'pending'
    const [result] = await db.query("INSERT INTO jobs (task_name, status) VALUES (?, 'pending')", [
      task,
    ]);

    Logger.info(
      `Tugas '${task}' berhasil ditambahkan ke antrian dengan ID: ${result.insertId}`,
      "CRON_ROUTER"
    );

    // Langsung kirim respons 'Accepted' (202) kembali ke frontend.
    // Ini memberitahu frontend bahwa permintaan telah diterima dan akan diproses.
    res.status(202).json({
      success: true,
      message: `Tugas '${task}' telah ditambahkan ke antrian dan akan segera diproses.`,
    });
  } catch (error) {
    Logger.error(`Gagal menambahkan tugas '${task}' ke antrian`, error, "CRON_ROUTER");
    res.status(500).json({ success: false, message: "Gagal memulai tugas." });
  }
});

export default router;

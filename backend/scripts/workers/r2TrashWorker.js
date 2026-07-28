// backend/scripts/workers/r2TrashWorker.js
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../../config/r2.js";
import db from "../../config/db.js";
import Logger from "../../utils/logger.js";

const BATCH_SIZE = 50;

/**
 * Worker untuk menghapus file dari R2 secara asinkron.
 * Script ini bisa dipanggil via CRON job.
 */
const run = async () => {
  Logger.info("Memulai proses pembersihan R2 Trash Queue...", "R2_TRASH_WORKER");

  let connection;
  try {
    if (!s3Client) {
      throw new Error("Kredensial R2 belum diatur.");
    }

    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
      throw new Error("R2_BUCKET_NAME belum diatur di environment.");
    }

    connection = await db.getConnection();
    const [rows] = await connection.query("SELECT id, r2_key FROM r2_trash_queue LIMIT ?", [
      BATCH_SIZE,
    ]);

    if (rows.length === 0) {
      Logger.info("Tidak ada file di antrean. Worker selesai.", "R2_TRASH_WORKER");
      process.exit(0);
    }

    Logger.info(`Ditemukan ${rows.length} file untuk dihapus.`, "R2_TRASH_WORKER");

    let successCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: row.r2_key,
        });

        await s3Client.send(command);

        // Jika berhasil dihapus di R2, hapus dari antrean
        await connection.query("DELETE FROM r2_trash_queue WHERE id = ?", [row.id]);
        successCount++;
        Logger.info(`Berhasil menghapus file: ${row.r2_key}`, "R2_TRASH_WORKER");
      } catch (err) {
        failedCount++;
        Logger.error(`Gagal menghapus file: ${row.r2_key}`, err, "R2_TRASH_WORKER");
      }
    }

    Logger.info(
      `Pembersihan selesai. Berhasil: ${successCount}, Gagal: ${failedCount}`,
      "R2_TRASH_WORKER",
    );
    process.exit(0);
  } catch (error) {
    Logger.error("R2 Trash Worker Error", error, "R2_TRASH_WORKER");
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
};

run();

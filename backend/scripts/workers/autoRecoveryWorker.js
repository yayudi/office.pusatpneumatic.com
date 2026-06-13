// backend/scripts/workers/autoRecoveryWorker.js
import db from "../../config/db.js";
import Logger from "../../utils/logger.js";
import * as locationRepo from "../../repositories/locationRepository.js";
import * as pickingRepo from "../../repositories/pickingRepository.js";

export const runAutoRecovery = async () => {
  let connection;
  try {
    connection = await db.getConnection();

    // Ambil semua item BACKORDER / PENDING tanpa lokasi
    const [unfulfillableRows] = await connection.query(`
      SELECT
        pli.id,
        pli.product_id,
        pli.quantity,
        pli.original_sku,
        pl.location_purpose
      FROM picking_list_items pli
      JOIN picking_lists pl ON pli.picking_list_id = pl.id
      WHERE (pli.status = 'BACKORDER' OR (pli.status = 'PENDING' AND pli.suggested_location_id IS NULL))
        AND pl.status IN ('PENDING', 'VALIDATED')
        AND pl.is_active = 1
        AND (pli.last_recovery_attempt IS NULL OR pli.last_recovery_attempt < NOW() - INTERVAL 3 HOUR)
      ORDER BY pli.id ASC
      LIMIT 100
    `);

    if (unfulfillableRows.length === 0) {
      return; // Tidak ada yang perlu di-recovery
    }

    Logger.info(
      `Mengecek ulang ketersediaan stok untuk ${unfulfillableRows.length} item BACKORDER...`,
      "AUTO_RECOVERY",
    );

    let recoveredCount = 0;
    const delay = (ms) => new Promise((res) => setTimeout(res, ms)); // Helper untuk throttling

    for (const item of unfulfillableRows) {
      const locationPurpose = item.location_purpose || "DISPLAY";
      let isSuccess = false;

      // Coba cari lokasi baru
      const newBestLocId = await locationRepo.findBestStock(
        connection,
        item.product_id,
        item.quantity,
        locationPurpose,
      );

      if (newBestLocId) {
        // Validasi ulang dengan locking
        await connection.beginTransaction();
        try {
          const newStock = await locationRepo.getStockAtLocation(
            connection,
            item.product_id,
            newBestLocId,
            true,
          );
          if (newStock >= item.quantity) {
            // Berhasil! Stok sudah direstock. Update DB.
            await pickingRepo.updateSuggestedLocation(connection, item.id, newBestLocId);

            // Reset last_recovery_attempt ke NULL karena sudah berhasil
            await connection.query(
              `UPDATE picking_list_items SET status = 'PENDING', last_recovery_attempt = NULL WHERE id = ?`,
              [item.id],
            );

            Logger.info(
              `🔄 Auto-Recovery Berhasil: Item ${item.original_sku} mendapatkan stok di lokasi ID ${newBestLocId}`,
              "AUTO_RECOVERY",
            );
            recoveredCount++;
            isSuccess = true;
            await connection.commit();
          } else {
            await connection.rollback();
          }
        } catch (innerErr) {
          await connection.rollback();
          Logger.error(
            `Gagal memproses Auto-Recovery untuk item ${item.id}`,
            innerErr,
            "AUTO_RECOVERY",
          );
        }
      }

      // Jika gagal divalidasi (tidak ada stok / error), update timestamp percobaan terakhir
      if (!isSuccess) {
        await connection.query(
          `UPDATE picking_list_items SET last_recovery_attempt = NOW() WHERE id = ?`,
          [item.id],
        );
      }

      // Throttling: Beri jeda 50ms per item agar CPU Shared Hosting bisa "bernapas" (menghindari spike CPU 100%)
      await delay(50);
    }

    if (recoveredCount > 0) {
      Logger.info(
        `Auto-Recovery Selesai: Berhasil memulihkan ${recoveredCount} item.`,
        "AUTO_RECOVERY",
      );
    }
  } catch (error) {
    Logger.error("Auto Recovery Worker Error", error, "AUTO_RECOVERY");
  } finally {
    if (connection) connection.release();
  }
};

import { fileURLToPath } from "url";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAutoRecovery()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

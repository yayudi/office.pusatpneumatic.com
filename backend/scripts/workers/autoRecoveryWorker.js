// backend/scripts/workers/autoRecoveryWorker.js
import db from '../../config/db.js';
import Logger from '../../utils/logger.js';
import * as locationRepo from '../../repositories/locationRepository.js';
import * as pickingRepo from '../../repositories/pickingRepository.js';

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
    `);

    if (unfulfillableRows.length === 0) {
      return; // Tidak ada yang perlu di-recovery
    }

    Logger.info(`Mengecek ulang ketersediaan stok untuk ${unfulfillableRows.length} item BACKORDER...`, 'AUTO_RECOVERY');

    let recoveredCount = 0;

    for (const item of unfulfillableRows) {
      const locationPurpose = item.location_purpose || 'DISPLAY';

      // Coba cari lokasi baru
      const newBestLocId = await locationRepo.findBestStock(connection, item.product_id, item.quantity, locationPurpose);
      
      if (newBestLocId) {
        // Validasi ulang dengan locking
        await connection.beginTransaction();
        try {
          const newStock = await locationRepo.getStockAtLocation(connection, item.product_id, newBestLocId, true);
          if (newStock >= item.quantity) {
             // Berhasil! Stok sudah direstock. Update DB.
             await pickingRepo.updateSuggestedLocation(connection, item.id, newBestLocId);
             await connection.query(`UPDATE picking_list_items SET status = 'PENDING' WHERE id = ?`, [item.id]);
             Logger.info(`🔄 Auto-Recovery Berhasil: Item ${item.original_sku} mendapatkan stok di lokasi ID ${newBestLocId}`, 'AUTO_RECOVERY');
             recoveredCount++;
             await connection.commit();
          } else {
             await connection.rollback();
          }
        } catch (innerErr) {
          await connection.rollback();
          Logger.error(`Gagal memproses Auto-Recovery untuk item ${item.id}`, innerErr, 'AUTO_RECOVERY');
        }
      }
    }

    if (recoveredCount > 0) {
      Logger.info(`Auto-Recovery Selesai: Berhasil memulihkan ${recoveredCount} item.`, 'AUTO_RECOVERY');
    }

  } catch (error) {
    Logger.error('Auto Recovery Worker Error', error, 'AUTO_RECOVERY');
  } finally {
    if (connection) connection.release();
  }
};

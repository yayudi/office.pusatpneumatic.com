import db from "../config/db.js";
import Logger from "../utils/logger.js";

/**
 * ID Pengguna yang akan dicatat di 'stock_movements'.
 * Ganti ini dengan ID pengguna "Admin" atau "Sistem" Anda.
 */
const ADMIN_USER_ID = 2147483651; // <-- GANTI INI (Contoh: ID admin Anda yang valid)

/**
 * Catatan yang akan muncul di 'stock_movements'.
 */
const NOTES = "Stock Opname - Set Display to 0";
const MOVEMENT_TYPE = "ADJUSTMENT";
const LOCATION_PURPOSE = "DISPLAY"; // <-- GANTI INI jika tujuannya beda

/**
 * Skrip sekali pakai untuk mengatur ulang stok lokasi (berdasarkan 'purpose') menjadi 0.
 * Ini akan mencatat setiap perubahan di 'stock_movements' dengan benar.
 *
 * CARA MENJALANKAN (dari folder 'backend'):
 * node scripts/run_opname_display_to_zero.js
 */
async function runStockOpname() {
  let connection;

  try {
    connection = await db.getConnection();

    // Mulai Transaksi
    await connection.beginTransaction();

    // Dapatkan semua ID lokasi yang ditargetkan
    const [locations] = await connection.query("SELECT id FROM locations WHERE purpose = ?", [
      LOCATION_PURPOSE,
    ]);

    if (locations.length === 0) {
      await connection.rollback();
      return;
    }

    const locationIds = locations.map((loc) => loc.id);

    // Dapatkan SEMUA item di lokasi tersebut yang stoknya TIDAK 0
    const [stocksToAdjust] = await connection.query(
      `SELECT product_id, location_id, quantity
       FROM stock_locations
       WHERE location_id IN (?) AND quantity != 0`,
      [locationIds]
    );

    if (stocksToAdjust.length === 0) {
      await connection.rollback();
      return;
    }

    let movementInserts = [];
    let locationUpdates = [];

    // Siapkan semua query (INSERT movement dan UPDATE location)
    for (const stock of stocksToAdjust) {
      const currentQty = stock.quantity;
      const movementQty = -Math.abs(currentQty); // Kuantitas yang dicatat adalah selisihnya

      // Siapkan query untuk stock_movements
      movementInserts.push(
        connection.query(
          `INSERT INTO stock_movements (product_id, to_location_id, quantity, movement_type, notes, user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [stock.product_id, stock.location_id, movementQty, MOVEMENT_TYPE, NOTES, ADMIN_USER_ID]
        )
      );

      // Siapkan query untuk stock_locations
      locationUpdates.push(
        connection.query(
          "UPDATE stock_locations SET quantity = 0 WHERE product_id = ? AND location_id = ?",
          [stock.product_id, stock.location_id]
        )
      );
    }

    // Eksekusi semua query
    Logger.info("Mencatat stock_movements...", "STOCK_OPNAME");
    await Promise.all(movementInserts);

    Logger.info("Mengatur stock_locations menjadi 0...", "STOCK_OPNAME");
    await Promise.all(locationUpdates);

    // Jika semua berhasil, commit transaksi
    await connection.commit();
    Logger.info(
      `SUKSES! Transaksi di-commit. ${stocksToAdjust.length} item diatur menjadi 0.`,
      "STOCK_OPNAME"
    );
  } catch (error) {
    Logger.error("ERROR TERJADI", error, "STOCK_OPNAME");
    if (connection) {
      await connection.rollback();
      Logger.error("Transaksi di-rollback. Tidak ada data yang diubah.", null, "STOCK_OPNAME");
    }
  } finally {
    if (connection) {
      connection.release();
      Logger.info("Koneksi DB dilepaskan.", "STOCK_OPNAME");
    }
    // Hentikan pool agar skrip bisa exit
    if (db.pool) {
      db.pool.end();
    }
  }
}

runStockOpname();

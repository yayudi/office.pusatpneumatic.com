// backend/services/pickingDataService.js
import db from "../config/db.js";
import Logger from "../utils/logger.js";

// REPOSITORIES
import * as pickingRepo from "../repositories/pickingRepository.js";
import * as locationRepo from "../repositories/locationRepository.js";
import * as stockRepo from "../repositories/stockMovementRepository.js";

const fileLog = (msg) => {
  Logger.warn(msg, "PICKING_DATA_SERVICE");
};

const logger = {
  info: (msg) => Logger.info(msg, "PICKING_DATA_SERVICE"),
  error: (msg, err) => Logger.error(msg, err, "PICKING_DATA_SERVICE"),
};

// ==============================================================================
// INTERNAL HELPERS
// ==============================================================================

/**
 * Helper Cerdas untuk Menentukan Lokasi Stok (Re-Check & Search)
 * Menggunakan Repository sepenuhnya.
 */
async function ensureStockLocation(
  connection,
  productId,
  qtyNeeded,
  currentLocId,
  locationPurpose = "DISPLAY",
) {
  // Skenario 1: Cek Lokasi Eksisting (Re-validasi)
  if (currentLocId) {
    // Menggunakan locationRepo dengan locking (true)
    const currentStock = await locationRepo.getStockAtLocation(
      connection,
      productId,
      currentLocId,
      true,
    );

    if (currentStock >= qtyNeeded) {
      return { locationId: currentLocId, isChanged: false, currentStock };
    } else {
      fileLog(
        `⚠️ Lokasi lama (ID ${currentLocId}) stok tidak cukup. Sisa: ${currentStock}, Butuh: ${qtyNeeded}. Mencari ulang...`,
      );
    }
  }

  // Skenario 2: Cari Lokasi Baru (JIT Lookup - Strict Display via Repo)
  const newBestLocId = await locationRepo.findBestStock(
    connection,
    productId,
    qtyNeeded,
    locationPurpose,
  );

  if (newBestLocId) {
    // [SAFETY CHECK] Verifikasi stok di lokasi baru
    // findBestStock mungkin mengembalikan lokasi terbaik yang ada, tapi belum tentu cukup (jika semua lokasi kurang)
    const newStock = await locationRepo.getStockAtLocation(
      connection,
      productId,
      newBestLocId,
      true,
    );

    if (newStock >= qtyNeeded) {
      return { locationId: newBestLocId, isChanged: true, currentStock: newStock };
    }

    fileLog(
      `⚠️ Lokasi alternatif (ID ${newBestLocId}) juga tidak cukup. Sisa: ${newStock}, Butuh: ${qtyNeeded}.`,
    );
  }

  return { locationId: null, isChanged: false, currentStock: 0 };
}

// ==============================================================================
// READ OPERATIONS
// ==============================================================================

/**
 * @returns {Promise<any>}
 */
export const getPendingPickingItemsService = async () => {
  const connection = await db.getConnection();
  try {
    return await pickingRepo.getPendingItems(connection);
  } finally {
    connection.release();
  }
};

/**
 * @param {number} limit
 * @returns {Promise<any>}
 */
export const getHistoryPickingItemsService = async (limit = 1000) => {
  const connection = await db.getConnection();
  try {
    return await pickingRepo.getHistoryItems(connection, limit);
  } finally {
    connection.release();
  }
};

/**
 * @param {number|string} pickingListId
 * @returns {Promise<any>}
 */
export const fetchPickingListDetails = async (pickingListId) => {
  const connection = await db.getConnection();
  try {
    return await pickingRepo.getListDetails(connection, pickingListId);
  } finally {
    connection.release();
  }
};

// ==============================================================================
// WRITE OPERATIONS (TRANSACTIONS)
// ==============================================================================

/**
 * @param {number|string} pickingListId
 * @param {number|string} userId
 * @returns {Promise<any>}
 */
export const voidPickingListService = async (pickingListId, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Cek & Kembalikan Stok untuk item yang sudah divalidasi
    const [itemsToRestock] = await connection.query(
      `SELECT product_id, quantity, confirmed_location_id
        FROM picking_list_items
        WHERE picking_list_id = ? AND status = 'VALIDATED' AND confirmed_location_id IS NOT NULL`,
      [pickingListId],
    );

    if (itemsToRestock.length > 0) {
      logger.info(`[VOID] Mengembalikan stok untuk ${itemsToRestock.length} item.`);
      for (const item of itemsToRestock) {
        await locationRepo.incrementStock(
          connection,
          item.product_id,
          item.confirmed_location_id,
          item.quantity,
        );

        await stockRepo.createLog(connection, {
          productId: item.product_id,
          quantity: item.quantity,
          toLocationId: item.confirmed_location_id,
          type: "VOID_RESTOCK",
          userId: userId,
          notes: `Manual Void Picking List #${pickingListId}`,
        });
      }
    }

    const [res] = await pickingRepo.voidHeader(connection, pickingListId);

    if (res.affectedRows === 0) {
      throw new Error("Picking List tidak ditemukan atau sudah dibatalkan.");
    }

    await pickingRepo.voidItemsByListId(connection, pickingListId);

    await connection.commit();
    return { success: true, message: "Picking List dibatalkan." };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Targeted Refresh: Cek ulang stok khusus untuk satu Picking List (Manual Trigger)
 */
export const retryBackordersService = async (pickingListId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const [unfulfillableRows] = await connection.query(`
      SELECT 
        pli.id, 
        pli.product_id, 
        pli.quantity, 
        pli.original_sku,
        pl.location_purpose
      FROM picking_list_items pli
      JOIN picking_lists pl ON pli.picking_list_id = pl.id
      WHERE pli.picking_list_id = ?
        AND (pli.status = 'BACKORDER' OR (pli.status = 'PENDING' AND pli.suggested_location_id IS NULL))
        AND pl.status IN ('PENDING', 'VALIDATED')
        AND pl.is_active = 1
    `, [pickingListId]);

    if (unfulfillableRows.length === 0) {
      await connection.rollback();
      return { success: true, message: "Tidak ada item backorder untuk pesanan ini." };
    }

    let recoveredCount = 0;

    for (const item of unfulfillableRows) {
      const bestLocation = await locationRepo.findBestStock(
        connection,
        item.product_id,
        item.quantity,
        item.location_purpose || "DISPLAY"
      );

      if (bestLocation) {
        await pickingRepo.updateSuggestedLocation(
          connection,
          item.id,
          bestLocation.location_id,
          bestLocation.stock_location_id,
          "PENDING"
        );
        recoveredCount++;
      }
    }

    await connection.commit();

    if (recoveredCount > 0) {
      return { success: true, message: `Berhasil mendapatkan stok untuk ${recoveredCount} dari ${unfulfillableRows.length} item backorder.` };
    } else {
      return { success: true, message: `Stok masih belum tersedia untuk ${unfulfillableRows.length} item.` };
    }

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Batch Targeted Refresh: Cek ulang stok untuk beberapa Picking List sekaligus
 */
export const retryBackordersBatchService = async (pickingListIds) => {
  if (!pickingListIds || pickingListIds.length === 0) {
    return { success: true, message: "Tidak ada picking list yang dipilih." };
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const placeholders = pickingListIds.map(() => '?').join(',');
    const [unfulfillableRows] = await connection.query(`
      SELECT 
        pli.id, 
        pli.product_id, 
        pli.quantity, 
        pli.original_sku,
        pl.location_purpose
      FROM picking_list_items pli
      JOIN picking_lists pl ON pli.picking_list_id = pl.id
      WHERE pli.picking_list_id IN (${placeholders})
        AND (pli.status = 'BACKORDER' OR (pli.status = 'PENDING' AND pli.suggested_location_id IS NULL))
        AND pl.status IN ('PENDING', 'VALIDATED')
        AND pl.is_active = 1
    `, pickingListIds);

    if (unfulfillableRows.length === 0) {
      await connection.rollback();
      return { success: true, message: "Tidak ada item backorder pada pesanan yang dipilih." };
    }

    let recoveredCount = 0;

    for (const item of unfulfillableRows) {
      const bestLocation = await locationRepo.findBestStock(
        connection,
        item.product_id,
        item.quantity,
        item.location_purpose || "DISPLAY"
      );

      if (bestLocation) {
        await pickingRepo.updateSuggestedLocation(
          connection,
          item.id,
          bestLocation.location_id,
          bestLocation.stock_location_id,
          "PENDING"
        );
        recoveredCount++;
      }
    }

    await connection.commit();

    if (recoveredCount > 0) {
      return { success: true, message: `Berhasil mendapatkan stok untuk ${recoveredCount} dari ${unfulfillableRows.length} item backorder.` };
    } else {
      return { success: true, message: `Stok masih belum tersedia untuk ${unfulfillableRows.length} item.` };
    }

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * SERVICE UTAMA: Menyelesaikan Item Picking
 * FITUR SAFETY CHECK: Memastikan picking list masih aktif & valid sebelum update.
 */
export const completePickingItemsService = async (payloadItems, userId) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    if (!payloadItems?.length) throw new Error("Tidak ada item dipilih.");

    // --- SAFETY CHECK START (REAL-TIME INTERRUPTION) ---
    // Pastikan order belum direvisi (menjadi _REV_) saat picker sedang bekerja
    const listIds = [...new Set(payloadItems.map((i) => i.picking_list_id))];
    const invoiceMap = new Map();
    const purposeMap = new Map();

    for (const listId of listIds) {
      const header = await pickingRepo.getHeaderById(connection, listId);

      if (!header) {
        throw new Error(`Data Picking List #${listId} tidak ditemukan. Mungkin sudah dihapus.`);
      }

      // Cek apakah status Header sudah "Obsolete" (ditandai dengan _REV_)
      if (header.original_invoice_id && header.original_invoice_id.includes("_REV_")) {
        throw new Error(
          `PERHATIAN: Order ${header.original_invoice_id} telah direvisi oleh Admin! ` +
            `Data Anda usang. Mohon refresh halaman dan kerjakan revisi terbaru.`,
        );
      }

      // Cek apakah status sudah Void
      if (header.status === "VOID" || header.status === "CANCELLED" || header.status === "CANCEL") {
        throw new Error(`Order #${listId} telah divoid (dibatalkan). Tidak dapat diproses.`);
      }

      // --- ANTI PARTIAL PROCESS CHECK ---
      // Blokir jika ada item yang tidak bisa dipenuhi (habis / tidak ada lokasi)
      const [unfulfillable] = await connection.query(
        `SELECT original_sku FROM picking_list_items
          WHERE picking_list_id = ?
            AND (status = 'BACKORDER' OR (status = 'PENDING' AND suggested_location_id IS NULL))`,
        [listId]
      );

      if (unfulfillable.length > 0) {
        const skuList = unfulfillable.map((u) => u.original_sku || "UNKNOWN").join(", ");
        throw new Error(
          `Pesanan ${header.original_invoice_id} memiliki item kosong/out-of-stock (SKU: ${skuList}). ` +
            `Pemrosesan parsial tidak diizinkan. Harap lengkapi stok terlebih dahulu atau batalkan pesanan.`
        );
      }

      invoiceMap.set(listId, header.original_invoice_id);
      purposeMap.set(listId, header.location_purpose || "DISPLAY");
    }
    // --- SAFETY CHECK END ---

    const itemIds = payloadItems.map((i) => i.id);
    const dbItems = await pickingRepo.getItemsByIds(connection, itemIds);

    // --- FASE 1: STRICT VALIDATION (SATPAM) ---
    const validationErrors = [];
    const executionPlan = []; // Menyimpan data valid untuk eksekusi nanti

    for (const itemData of dbItems) {
      const {
        product_id: prodId,
        quantity: qty,
        suggested_location_id: initialLocId,
        picking_list_id,
        original_sku: sku,
      } = itemData;

      const locationPurpose = purposeMap.get(picking_list_id) || "DISPLAY";

      // Cek apakah item sudah diproses
      if (itemData.status !== "PENDING" && itemData.status !== "BACKORDER") {
        const invRef = invoiceMap.get(picking_list_id) || "UNKNOWN-INV";
        validationErrors.push(
          `INV [${invRef}] - SKU ${sku || "Prod ID " + prodId}: Item sudah diproses (Status: ${itemData.status}).`,
        );
        continue;
      }

      // Cek ketersediaan stok & lokasi
      const { locationId, isChanged } = await ensureStockLocation(
        connection,
        prodId,
        qty,
        initialLocId,
        locationPurpose,
      );

      if (!locationId) {
        // Gagal: Stok tidak ditemukan sama sekali
        const invRef = invoiceMap.get(picking_list_id) || "UNKNOWN-INV";
        validationErrors.push(
          `INV [${invRef}] - SKU ${sku || "Prod ID " + prodId}: Stok habis/tidak cukup di lokasi manapun.`,
        );
      } else {
        // Sukses: Simpan rencana eksekusi
        executionPlan.push({
          ...itemData,
          finalLocationId: locationId,
          isLocationChanged: isChanged,
        });
      }
    }

    // [BLOCKER] Jika ada error, batalkan SEMUA.
    if (validationErrors.length > 0) {
      const errorMsg = `Validasi Gagal Ditemukan ${validationErrors.length} stok bermasalah.`;
      const error = new Error(errorMsg);
      error.details = validationErrors;
      throw error;
    }

    // --- FASE 2: EKSEKUSI AMAN ---
    const affectedListIds = new Set();
    let processedCount = 0;

    for (const plan of executionPlan) {
      const {
        id: itemId,
        product_id: prodId,
        quantity: qty,
        finalLocationId,
        isLocationChanged,
        picking_list_id,
      } = plan;

      // Update Lokasi jika berubah
      if (isLocationChanged) {
        await pickingRepo.updateSuggestedLocation(connection, itemId, finalLocationId);
        fileLog(`🔄 Re-route Item ID ${itemId} ke lokasi baru: ${finalLocationId}`);
      }

      // 2. Update Status Item -> VALIDATED
      await pickingRepo.validateItem(connection, itemId, finalLocationId);

      // 3. Potong Stok Fisik
      await locationRepo.deductStock(connection, prodId, finalLocationId, qty);

      // 4. Catat Log
      const invoiceRef = invoiceMap.get(picking_list_id) || `List #${picking_list_id}`;
      await stockRepo.createLog(connection, {
        productId: prodId,
        quantity: qty,
        fromLocationId: finalLocationId,
        type: "SALE",
        userId: userId,
        notes: `Sale Ref: ${invoiceRef} (Item #${itemId})`,
      });

      affectedListIds.add(picking_list_id);
      processedCount++;
    }

    // --- FASE 3: UPDATE HEADER ---
    for (const listId of affectedListIds) {
      const remainingCount = await pickingRepo.countPendingItems(connection, listId);
      if (remainingCount === 0) {
        await pickingRepo.validateHeader(connection, listId);
      }
    }

    await connection.commit();

    return {
      success: true,
      message: `Sukses! ${processedCount} item berhasil diproses dan stok telah dipotong.`,
    };
  } catch (error) {
    await connection.rollback();
    Logger.error("Complete Transaction Failed", error, "PICKING_DATA_SERVICE");
    throw error;
  } finally {
    connection.release();
  }
};

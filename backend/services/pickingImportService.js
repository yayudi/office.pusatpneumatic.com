// backend/services/pickingImportService.js
import db from "../config/db.js";
import * as validationHelper from "./helpers/pickingValidationHelper.js";
import Logger from "../utils/logger.js";

// Helper log sederhana dengan Timestamp
const log = (msg) => {
  Logger.info(msg, "PICKING_IMPORT_SERVICE");
};

/**
 * SERVICE: Process Import Data (Orchestrator)
 */
export const syncOrdersToDB = async (
  connection,
  groupedOrders,
  userId,
  originalFilename,
  onProgress = null,
  dryRun = false,
  locationPurpose = "DISPLAY",
  shopName = null
) => {
  const summary = { processed: 0, updatedCount: 0, errors: [] };
  const ordersToProcess = Array.from(groupedOrders.values());
  const totalOrders = ordersToProcess.length;

  if (totalOrders === 0) return summary;

  log(`🚀 Memulai proses ${totalOrders} order. Mode: ${dryRun ? "DRY RUN (Simulasi)" : "LIVE"}`);

  if (onProgress) await onProgress(0, totalOrders);

  try {
    const allSkus = new Set();
    ordersToProcess.forEach((order) => {
      order.items.forEach((item) => allSkus.add(item.sku));
    });

    log(`📦 Mengambil referensi untuk ${allSkus.size} SKU unik...`);
    const dbData = await validationHelper.fetchReferenceData(connection, Array.from(allSkus), locationPurpose);

    await connection.beginTransaction();

    try {
      log(`🔄 Sinkronisasi status order lama...`);

      ordersToProcess.forEach((o) => (o.originalFilename = originalFilename));

      const newOrdersToInsert = await validationHelper.handleExistingInvoices(
        connection,
        ordersToProcess
      );

      log(`✨ ${newOrdersToInsert.length} order baru siap divalidasi & insert.`);

      let processedCounter = 0;

      for (const order of newOrdersToInsert) {
        const { validItems, invalidSkus } = validationHelper.calculateValidations(
          order.items,
          dbData
        );

        if (invalidSkus.length > 0) {
          invalidSkus.forEach((err) => summary.errors.push(`Order ${order.invoiceId}: ${err}`));
          continue;
        }

        if (validItems.length > 0) {
          const meta = {
            userId,
            source: order.source,
            originalFilename: originalFilename,
            originalInvoiceId: order.invoiceId,
            customerName: order.customer,
            orderDate: order.orderDate,
            status: order.status,
            locationPurpose,
            shopName,
          };

          const listId = await validationHelper.insertPickingHeader(connection, meta);
          await validationHelper.insertPickingItems(
            connection,
            listId,
            validItems,
            dbData.validProductMap
          );

          summary.processed++;
        }

        processedCounter++;
        if (onProgress && processedCounter % 5 === 0) {
          await onProgress(processedCounter, totalOrders);
        }
      }

      if (dryRun) {
        log(`🛑 Dry Run Selesai. Melakukan ROLLBACK...`);
        await connection.rollback();
        summary.updatedCount = 0; // Reset count karena tidak ada yang tersimpan
      } else {
        await connection.commit();
        log(`Transaksi COMMITTED.`);
        summary.updatedCount = summary.processed;
      }

      if (onProgress) await onProgress(totalOrders, totalOrders);
    } catch (innerError) {
      // Rollback jika ada error di tengah proses logic
      await connection.rollback();
      throw innerError;
    }
  } catch (error) {
    Logger.error("Critical Error", error, "PICKING_IMPORT_SERVICE");
    summary.errors.push(`System Error: ${error.message}`);
    throw error;
  }

  return summary;
};

export const performPickingValidation = async (payload) => {
  throw new Error("Deprecated: Use Job Queue Import instead.");
};

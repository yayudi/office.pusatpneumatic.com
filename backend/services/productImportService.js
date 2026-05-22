// backend/services/priceImportService.js
import { ParserEngine } from "./parsers/ParserEngine.js";
import * as productRepo from "../repositories/productRepository.js";
import Logger from "../utils/logger.js";

export const processProductImport = async (
  connection,
  filePath,
  userId,
  originalFilename,
  updateProgressCallback,
  isDryRun = false,
  options = {},
) => {
  let logSummary = "";
  const logicErrors = [];
  let updatedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  // Pagination / Resume Support
  let startIndex = options.lastRow || 0;
  let processedInThisRun = 0;

  // Time limit check (25 detik untuk Shared Hosting)
  const startTime = Date.now();
  const TIME_LIMIT = 25000;

  Logger.info(
    `Processing: ${originalFilename} (DryRun: ${isDryRun}) start: ${startIndex}`,
    "PRODUCT_IMPORT_SERVICE",
  );

  try {
    // Gunakan Mapper baru 'MassProductUpdate'
    const parser = new ParserEngine(filePath, "MassProductUpdate");

    const { orders: dataMap, stats, errors: parserErrors } = await parser.run();
    logicErrors.push(...parserErrors);

    const totalItems = dataMap.size;
    const allData = Array.from(dataMap.values());

    logSummary += `Total baris terbaca: ${totalItems}. `;

    for (let i = startIndex; i < totalItems; i++) {
      // Cek Timeout
      if (Date.now() - startTime > TIME_LIMIT) {
        return {
          logSummary: logSummary + ` (Paused at row ${i})`,
          errors: logicErrors,
          stats: {
            total: totalItems,
            success: updatedCount + createdCount,
            failed: logicErrors.length,
          },
          partial: true,
          nextOptions: { lastRow: i },
        };
      }

      const csvItem = allData[i];
      const row = csvItem.items && csvItem.items[0] ? csvItem.items[0].row : 0;
      const { sku } = csvItem;

      try {
        // 1. Cek Eksistensi Produk di DB
        const [existingRows] = await connection.query("SELECT * FROM products WHERE sku = ?", [
          sku,
        ]);
        const productExists = existingRows.length > 0;
        const dbProduct = existingRows[0];

        if (productExists) {
          // --- UPDATE SCENARIO ---
          const payload = {
            name: csvItem.name || dbProduct.name,
            price:
              csvItem.price !== undefined && csvItem.price !== "" ? csvItem.price : dbProduct.price,
            weight:
              csvItem.weight !== undefined && csvItem.weight !== ""
                ? csvItem.weight
                : dbProduct.weight,
            is_package: 0,
            is_active:
              csvItem.is_active !== undefined && csvItem.is_active !== ""
                ? csvItem.is_active
                : dbProduct.is_active,
          };

          // [PHASE 1] SAFETY GUARD: Reject Package Updates via Batch Edit
          if (dbProduct.is_package === 1) {
            logicErrors.push({
              row,
              message: `SKU '${sku}' adalah Paket. Batch Edit ini hanya untuk Produk Biasa.`,
            });
            skippedCount++;
            continue;
          }

          if (!isDryRun) {
            // Panggil Repository Update (Ini otomatis catat Audit Log!)
            await productRepo.updateProductTransaction(
              connection,
              dbProduct.id,
              payload,
              [],
              userId,
            );

            // Handle status aktif/nonaktif khusus
            if (csvItem.is_active !== undefined && csvItem.is_active !== "") {
              const isActiveBool =
                csvItem.is_active === 1 ||
                csvItem.is_active === "1" ||
                csvItem.is_active === true ||
                csvItem.is_active === "true";
              await productRepo.updateProductStatus(connection, dbProduct.id, isActiveBool);
            }
          }
          updatedCount++;
        } else {
          logicErrors.push({
            row,
            message: `SKU '${sku}' tidak ditemukan. Batch Edit hanya untuk update produk yang sudah ada.`,
          });
          skippedCount++;
        }
      } catch (err) {
        logicErrors.push({ row, message: `Error SKU ${sku}: ${err.message}` });
      }

      processedInThisRun++;
      // Update progress DB
      if (processedInThisRun % 20 === 0 && updateProgressCallback) {
        await updateProgressCallback(i + 1, totalItems);
      }
    }

    const modeText = isDryRun ? "[SIMULASI] " : "";
    logSummary = `${modeText}Selesai. Baru: ${createdCount}, Update: ${updatedCount}, Gagal: ${logicErrors.length}.`;

    // Return format standar yang diharapkan importQueue.js
    return {
      logSummary,
      errors: logicErrors,
      stats: {
        total: totalItems,
        success: createdCount + updatedCount,
        failed: logicErrors.length,
      },
    };
  } catch (error) {
    Logger.error("Error", error, "PRODUCT_IMPORT_SERVICE");
    throw error;
  }
};

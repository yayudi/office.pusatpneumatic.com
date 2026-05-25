// backend/utils/workerHelpers.js
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import Logger from "./logger.js";

/**
 * Membersihkan header dari simbol aneh dan normalisasi.
 * Contoh: "*Nomor Tagihan" -> "nomor tagihan"
 */
export const normalizeHeader = (header) => {
  if (!header) return "";
  return header
    .toString()
    .toLowerCase()
    .replace(/^\uFEFF/, "") // Hapus BOM
    .replace(/\u00A0/g, " ") // Non-breaking space
    .replace(/[^\w\s]/gi, "") // Hapus karakter spesial
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Membaca cell Excel dengan aman (handle Rich Text, Formula, Date).
 */
export const getSafeStr = (cell) => {
  if (cell === null || cell === undefined) return "";

  // Handle ExcelJS objects
  if (typeof cell === "object") {
    if (cell.richText)
      return cell.richText
        .map((p) => p.text)
        .join("")
        .trim();
    if (cell.result !== undefined) return cell.result.toString().trim();
    if (cell.text) return cell.text.toString().trim();
    if (cell instanceof Date) return cell.toISOString();
  }

  return cell.toString().trim();
};

/**
 * Memastikan direktori ada, jika tidak maka dibuat (recursive)
 * @param {string} dirPath - Path absolute folder
 * @param {string} logTag - Tag untuk logging
 */
export const ensureDirectoryExists = (dirPath, logTag = "WORKER_HELPER") => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (err) {
      Logger.error(`Gagal membuat direktori: ${dirPath}`, err, logTag);
    }
  }
};

/**
 * Generate File Excel berisi error/validasi dari proses Import.
 * Mengembalikan relative URL untuk di-download.
 */
export async function generateErrorFile(originalFilePath, errors, headerRowIndex = 1, jobId, exportDir) {
  try {
    if (!fs.existsSync(originalFilePath)) return null;

    const originalWorkbook = new ExcelJS.Workbook();
    const ext = path.extname(originalFilePath).toLowerCase();

    const readOptions = {
      parserOptions: {
        delimiter: ",",
        quote: '"',
        relax_column_count: true,
        cast: false,
        map: (val) => val,
      },
      map: (val) => val,
    };

    if (ext === ".csv") {
      await originalWorkbook.csv.readFile(originalFilePath, readOptions);
    } else {
      await originalWorkbook.xlsx.readFile(originalFilePath);
    }

    const originalSheet = originalWorkbook.worksheets[0];
    if (!originalSheet) return null;

    const errorWorkbook = new ExcelJS.Workbook();
    const errorSheet = errorWorkbook.addWorksheet("Perbaikan Data");

    const headerRow = originalSheet.getRow(headerRowIndex);
    errorSheet.getRow(1).values = headerRow.values;

    const errorColIdx = headerRow.cellCount + 1;
    const errorHeaderCell = errorSheet.getRow(1).getCell(errorColIdx);
    errorHeaderCell.value = "SYSTEM ERROR MESSAGE";
    errorHeaderCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    errorHeaderCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFCC0000" },
    };

    const errorMap = new Map();
    errors.forEach((e) => {
      if (e.row) errorMap.set(e.row, e.message);
    });

    Logger.info(
      `Generate Error File: ${errors.length} total errors, ${errorMap.size} mapped to rows.`,
      "WORKER_HELPER"
    );

    let targetRowIdx = 2;
    const sortedRowIndices = Array.from(errorMap.keys()).sort((a, b) => a - b);

    sortedRowIndices.forEach((sourceRowIdx) => {
      const msg = errorMap.get(sourceRowIdx);
      const sourceRow = originalSheet.getRow(sourceRowIdx);
      const targetRow = errorSheet.getRow(targetRowIdx);

      sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let safeValue = cell.value;
        if (safeValue !== null && safeValue !== undefined) {
          safeValue = String(safeValue);
        }
        const targetCell = targetRow.getCell(colNumber);
        targetCell.value = safeValue;
        targetCell.numFmt = "@";
      });

      const errorCell = targetRow.getCell(errorColIdx);
      errorCell.value = msg;

      if (msg && msg.includes("s,?")) {
        errorCell.font = { color: { argb: "FF777777" }, italic: true };
      } else {
        errorCell.font = { color: { argb: "FFFF0000" }, bold: true };
      }

      targetRow.commit();
      targetRowIdx++;
    });

    const filename = `error_fix_job_${jobId}_${Date.now()}.xlsx`;
    const outputPath = path.join(exportDir, filename);

    await errorWorkbook.xlsx.writeFile(outputPath);
    return `/uploads/exports/${filename}`;
  } catch (error) {
    Logger.error("Gagal generate error file", error, "WORKER_HELPER");
    return null;
  }
}

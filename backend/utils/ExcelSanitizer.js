// backend\utils\ExcelSanitizer.js
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import Logger from "./logger.js";

/**
 * @param {string} filePath - Absolute path to the corrupted file
 * @returns {Promise<string>} - Path to the sanitized file
 */
export const sanitizeExcel = async (filePath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const cleanBuffer = await workbook.xlsx.writeBuffer();
    fs.writeFileSync(filePath, cleanBuffer);
    return filePath;
  } catch (error) {
    Logger.error("Repair failed", error, "EXCEL_SANITIZER");
    throw error;
  }
};

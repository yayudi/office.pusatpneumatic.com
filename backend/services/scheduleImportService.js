import db from "../config/db.js";
import ExcelJS from "exceljs";
import fs from "fs";
import * as scheduleRepository from "../repositories/scheduleRepository.js";

/**
 * Process Batch Schedule Import from Excel
 */
export const processScheduleImport = async (jobId, filePath, userId) => {
  let connection;
  const errors = [];
  let successCount = 0;

  try {
    connection = await db.getConnection();

    // Pre-fetch Data for Validation (Cache)
    const [users] = await connection.query("SELECT id, username FROM users");
    const [shifts] = await connection.query("SELECT id, name FROM shifts");

    const userMap = new Map(users.map(u => [u.username.toLowerCase(), u.id]));
    const shiftMap = new Map(shifts.map(s => [s.name.toLowerCase(), s.id]));

    // Read Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet(1);

    if (!sheet) throw new Error("File Excel tidak valid atau kosong.");

    const schedulesToInsert = [];

    // Parse Rows
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return; // Skip Header (1) AND Example (2)

      // Columns: A=Username, B=Date, C=Shift Name
      const username = row.getCell(1).text?.trim();
      const dateVal = row.getCell(2).value; // Get raw value
      const shiftName = row.getCell(3).text?.trim();

      // Handle Excel Date Object or String
      let dateStr = "";
      if (dateVal instanceof Date) {
        const year = dateVal.getFullYear();
        const month = String(dateVal.getMonth() + 1).padStart(2, '0');
        const day = String(dateVal.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      } else if (typeof dateVal === 'string') {
        dateStr = dateVal.trim();
      } else if (typeof dateVal === 'object' && dateVal !== null && dateVal.text) {
        dateStr = dateVal.text;
      }

      if (!username && !dateStr && !shiftName) return;

      // Validation
      if (!username) {
        errors.push({ row: rowNumber, message: "Username wajib diisi." });
        return;
      }
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.push({ row: rowNumber, message: "Format Tanggal salah (Gunakan YYYY-MM-DD)." });
        return;
      }
      if (!shiftName) {
        errors.push({ row: rowNumber, message: "Nama Shift wajib diisi." });
        return;
      }

      const uId = userMap.get(username.toLowerCase());
      if (!uId) {
        errors.push({ row: rowNumber, message: `User '${username}' tidak ditemukan.` });
        return;
      }

      const sId = shiftMap.get(shiftName.toLowerCase());
      if (!sId) {
        errors.push({ row: rowNumber, message: `Shift '${shiftName}' tidak ditemukan.` });
        return;
      }

      schedulesToInsert.push({
        userId: uId,
        shiftId: sId,
        date: dateStr,
        createdBy: userId
      });
    });

    if (errors.length > 0) {
      return { success: false, errors, count: 0 };
    }

    if (schedulesToInsert.length === 0) {
      return { success: false, errors: ["Tidak ada data valid."], count: 0 };
    }

    // Batch Upsert
    await connection.beginTransaction();
    for (const schedule of schedulesToInsert) {
      await scheduleRepository.upsertSchedule(schedule);
      successCount++;
    }
    await connection.commit();

    return { success: true, count: successCount, errors: [] };

  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

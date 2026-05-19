import fs from "fs";
import path from "path";
import readline from "readline";
import db from "../config/db.js";
import Logger from "../utils/logger.js";
import "dotenv/config";

async function migrate() {
  // Ambil koneksi DB TERLEBIH DAHULU agar stream tidak berjalan duluan dan kehilangan data
  const connection = await db.getConnection();
  await connection.beginTransaction();

  const csvPath = path.resolve("../uploads/Product Database.csv");
  
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let successCount = 0;
  let skipCount = 0;

  console.group('=== Memulai Migrasi Kategori ===');

  try {
    let isHeader = true;
    for await (const line of rl) {
      if (isHeader) { isHeader = false; continue; }

      // Manual CSV Parser agar koma (,) di dalam kutipan tidak memecah string dengan salah
      const parts = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { parts.push(current); current = ''; }
        else current += char;
      }
      parts.push(current);

      const sku = parts[0]?.trim();
      const kategori = parts[2]?.trim();

      // Ambil id kategori berdasarkan nama
      const [catRows] = await connection.query('SELECT id FROM categories WHERE name = ?', [kategori]);
      if (catRows.length > 0) {
        await connection.query('UPDATE products SET category_id = ? WHERE sku = ?', [catRows[0].id, sku]);
        Logger.info(`SKU: ${sku} | Kategori: ${kategori} -> ID: ${catRows[0].id}`, "MIGRATE_CAT");
        successCount++;
      } else {
        Logger.warn(`SKU: ${sku} | Kategori tidak ditemukan: "${kategori}"`, "MIGRATE_CAT");
        skipCount++;
      }
    }

    await connection.commit();
    console.groupEnd();
    Logger.info(`Migrasi selesai! Berhasil: ${successCount}, Dilewati: ${skipCount}`, "MIGRATE_CAT");
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.groupEnd();
    Logger.error("Migrasi gagal! Seluruh perubahan di-rollback.", err, "MIGRATE_CAT");
    process.exit(1);
  } finally {
    connection.release();
  }
}

migrate();

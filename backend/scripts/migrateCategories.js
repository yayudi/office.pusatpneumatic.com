import fs from "fs";
import path from "path";
import readline from "readline";
import db from "../config/db.js";
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
        console.log(`✅ [OK] SKU: ${sku} | Kategori: ${kategori} -> ID: ${catRows[0].id}`);
        successCount++;
      } else {
        console.warn(`⚠️ [SKIP] SKU: ${sku} | Kategori tidak ditemukan: "${kategori}"`);
        skipCount++;
      }
    }

    await connection.commit();
    console.groupEnd();
    console.log(`\n🎉 Migrasi selesai! Berhasil: ${successCount}, Dilewati: ${skipCount}`);
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.groupEnd();
    console.error('\n❌ Migrasi gagal! Seluruh perubahan di-rollback.', err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

migrate();

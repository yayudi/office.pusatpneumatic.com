import fs from "fs/promises";
import path from "path";
import https from "https"; // Gunakan native HTTPS untuk menghindari Wasm OOM
import db from "../config/db.js";
import { fileURLToPath } from "url";

// Fix __dirname for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

// Helper: Fetch JSON menggunakan native 'https' (Zero Dependency & No Wasm)
function fetchJsonNative(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "MyOffice-Cron/1.0" } }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Status HTTP: ${res.statusCode}`));
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error("Gagal parsing JSON: " + err.message));
        }
      });
    });
    req.on("error", (err) => reject(err));
    req.end();
  });
}

export async function fetchAndCacheHolidays(targetYear = null) {
  const year = targetYear || new Date().getFullYear();
  const url = `https://libur.deno.dev/api?year=${year}`;

  log(`[FETCH-HOLIDAYS] 🚀 Memulai proses untuk tahun ${year}...`);

  let connection;

  try {
    // 1. Fetch from API (Native HTTPS)
    log(`[API] Fetching ${url}...`);
    const data = await fetchJsonNative(url);

    if (!Array.isArray(data)) {
      throw new Error("Format respons API tidak valid (Bukan Array).");
    }

    // Filter valid entries
    const validHolidays = data.filter((row) => row.date && row.name);
    log(`[API] Diterima ${validHolidays.length} hari libur.`);

    // 2. Database Sync (Primary)
    log(`[DB] Sinkronisasi ke Database...`);
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Hapus data lama untuk tahun tersebut
    await connection.query("DELETE FROM holidays WHERE YEAR(date) = ?", [year]);

    // Insert data baru
    if (validHolidays.length > 0) {
      const values = validHolidays.map((row) => [row.date, row.name]);
      await connection.query("INSERT INTO holidays (date, name) VALUES ?", [values]);
    }

    await connection.commit();
    log(`[DB] ✅ Sukses tersimpan ke MySQL.`);

    // 3. Legacy File Check (JSON)
    const backendRoot = path.resolve(__dirname, "..");
    const outputDir = path.join(backendRoot, "public", "json", "absensi", "holidays");
    const outFile = path.join(outputDir, `${year}.json`);

    log(`[FILE] Menyimpan ke Legacy Path: ${outFile}...`);
    await ensureDir(outputDir);
    await fs.writeFile(outFile, JSON.stringify(validHolidays, null, 2));
    log(`[FILE] ✅ Sukses tersimpan sebagai JSON.`);

  } catch (error) {
    if (connection) await connection.rollback();
    log(`🔥 [ERROR] ${error.message}`);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// --- Runner Block ---
// Eksekusi jika dijalankan langsung via node
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    try {
      // Cek argumen --year
      const yearArgIndex = process.argv.indexOf("--year");
      let year = null;
      if (yearArgIndex !== -1 && process.argv[yearArgIndex + 1]) {
        year = parseInt(process.argv[yearArgIndex + 1]);
      }

      await fetchAndCacheHolidays(year);
      log("🎉 [DONE] Skrip selesai.");
      process.exit(0);
    } catch (error) {
      log(`💀 [FATAL] Skrip gagal total.`);
      process.exit(1);
    } finally {
      if (db && db.pool) await db.pool.end();
    }
  })();
}

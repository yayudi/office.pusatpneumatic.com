import fs from "fs/promises";
import path from "path";
import https from "https";
import db from "../config/db.js";
import { fileURLToPath } from "url";
import Logger from "../utils/logger.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function log(message) {
  Logger.info(message, "FETCH_HOLIDAYS");
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
    log(`[API] Fetching ${url}...`);
    const data = await fetchJsonNative(url);

    if (!Array.isArray(data)) {
      throw new Error("Format respons API tidak valid (Bukan Array).");
    }

    const validHolidays = data.filter((row) => row.date && row.name);
    log(`[API] Diterima ${validHolidays.length} hari libur.`);
    log(`[DB] Sinkronisasi ke Database...`);
    connection = await db.getConnection();
    await connection.beginTransaction();
    await connection.query("DELETE FROM holidays WHERE YEAR(date) = ?", [year]);
    if (validHolidays.length > 0) {
      const values = validHolidays.map((row) => [row.date, row.name]);
      await connection.query("INSERT INTO holidays (date, name) VALUES ?", [values]);
    }
    await connection.commit();
    log(`[DB] Sukses tersimpan ke MySQL.`);
    const backendRoot = path.resolve(__dirname, "..");
    const outputDir = path.join(backendRoot, "public", "json", "absensi", "holidays");
    const outFile = path.join(outputDir, `${year}.json`);
    log(`[FILE] Menyimpan ke Legacy Path: ${outFile}...`);
    await ensureDir(outputDir);
    await fs.writeFile(outFile, JSON.stringify(validHolidays, null, 2));
    log(`[FILE] Sukses tersimpan sebagai JSON.`);
  } catch (error) {
    if (connection) await connection.rollback();
    Logger.error("Gagal melakukan fetch dan cache holidays", error, "FETCH_HOLIDAYS");
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    try {
      const yearArgIndex = process.argv.indexOf("--year");
      let year = null;
      if (yearArgIndex !== -1 && process.argv[yearArgIndex + 1]) {
        year = parseInt(process.argv[yearArgIndex + 1]);
      }

      await fetchAndCacheHolidays(year);
      log("🎉 [DONE] Skrip selesai.");
      process.exit(0);
    } catch (error) {
      Logger.error("Skrip gagal total", error, "FETCH_HOLIDAYS");
      process.exit(1);
    }
  })();
}

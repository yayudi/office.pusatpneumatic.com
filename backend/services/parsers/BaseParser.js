// backend\services\parsers\BaseParser.js
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { fileURLToPath } from "url"; // Added for robust path resolving
import { sanitizeExcel } from "../../utils/ExcelSanitizer.js";
import { normalizeHeader, getSafeStr } from "../../utils/workerHelpers.js";
import Logger from "../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BaseParser {
  /**
   * @param {string} filePath - Lokasi file absolut atau relatif
   * @param {string} source - Tipe import (Tokopedia, Shopee, MassPriceUpdate, dll)
   * @param {object} mapper - Konfigurasi mapping (dari importMappers.js)
   * @param {string[]} goldenKeys - Kata kunci untuk deteksi header
   * @param {string} csvDelimiter - Delimiter CSV (default koma, bisa titik koma)
   */
  constructor(filePath, source, mapper, goldenKeys, csvDelimiter = ",") {
    // FIX: Resolusi Path yang lebih robust
    if (path.isAbsolute(filePath)) {
      this.filePath = filePath;
    } else {
      const projectRoot = path.resolve(__dirname, "../../");
      this.filePath = path.join(projectRoot, filePath);
    }

    this.source = source || "UNKNOWN";
    this.mapper = mapper;
    this.goldenKeys = goldenKeys;
    this.csvDelimiter = csvDelimiter;

    this.stats = { totalRows: 0, success: 0, failed: 0, skippedStatus: 0 };
    this.auditLog = [];
    this.sanitized = false;
    this.parserTag = `${String(this.source).toUpperCase()}_PARSER`;
  }

  _normalizeHeaderClean(val) {
    return normalizeHeader(val);
  }

  async run() {
    Logger.info(`START: ${path.basename(this.filePath)}`, this.parserTag);
    Logger.debug(`Reading from: ${this.filePath}`, this.parserTag); // Debug log tambahan

    const workbook = new ExcelJS.Workbook();

    try {
      const ext = path.extname(this.filePath).toLowerCase();

      if (ext === ".csv") {
        Logger.debug(`Mode CSV Manual Read (fs). Delimiter: '${this.csvDelimiter}'`, this.parserTag);

        // Baca file manual untuk handle CSV yang berantakan (multiline di dalam quotes)
        const fileContent = fs.readFileSync(this.filePath, "utf8");
        const sheet = workbook.addWorksheet("Sheet1");

        const rawLines = fileContent.split(/\r?\n/);
        const mergedLines = [];
        let buffer = "";
        let inQuote = false;

        // Algoritma Penyeimbang Tanda Kutip
        for (let i = 0; i < rawLines.length; i++) {
          const line = rawLines[i];
          // Hitung jumlah tanda kutip di baris ini
          const quoteCount = (line.match(/"/g) || []).length;

          // Jika buffer tidak kosong, tambahkan newline yang hilang karena split sebelumnya
          if (inQuote) {
            buffer += "\n" + line;
          } else {
            buffer = line;
          }

          // Jika jumlah kutip ganjil, toggle status inQuote (Masuk/Keluar kutip)
          // Ganjil + Ganjil = Genap (Keluar)
          // Genap + Ganjil = Ganjil (Masuk)
          if (quoteCount % 2 === 1) {
            inQuote = !inQuote;
          }

          // Jika sudah seimbang (tidak di dalam kutip), push ke mergedLines
          if (!inQuote) {
            if (buffer.trim()) {
              // Skip baris kosong murni
              mergedLines.push(buffer);
            }
            buffer = "";
          }
        }

        // Proses baris yang sudah digabung dengan benar
        mergedLines.forEach((line) => {
          // Regex split CSV (abaikan delimiter di dalam tanda kutip)
          // Menggunakan delimiter dinamis dari constructor
          const delimiterRegex = this.csvDelimiter === ";" ? /;/ : /,/;
          const regexStr = `\\s*${this.csvDelimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)\\s*`;
          const regex = new RegExp(regexStr);

          const rowValues = line.split(regex).map((val) => {
            let clean = val.trim();
            // Hapus tanda kutip pembungkus jika ada
            if (clean.startsWith('"') && clean.endsWith('"')) {
              clean = clean.slice(1, -1);
            }
            // Unescape double quotes ("" -> ")
            return clean.replace(/""/g, '"');
          });

          sheet.addRow(rowValues);
        });
      } else {
        // Mode Excel Biasa
        await workbook.xlsx.readFile(this.filePath);
      }

      const result = await this._processWorkbookData(workbook);

      Logger.info(`FINISH. Stats: ${JSON.stringify(this.stats)}`, this.parserTag);
      return {
        orders: result.orders,
        stats: this.stats,
        errors: this.auditLog,
        headerRowIndex: result.headerRowIdx,
      };
    } catch (error) {
      Logger.error("Error di run()", error, this.parserTag);

      const isRescueable =
        error.message === "LOW_HEADER_SCORE" ||
        error.message === "FORCE_SANITIZE" ||
        error.message.includes("end of central directory");

      // Mekanisme Self-Healing: Coba sanitasi file jika korup
      if (isRescueable && !this.sanitized) {
        Logger.warn(
          `File Error (${error.message}). Mencoba Sanitasi...`,
          this.parserTag
        );
        try {
          await sanitizeExcel(this.filePath);
          this.sanitized = true;
          this.stats = { totalRows: 0, success: 0, failed: 0, skippedStatus: 0 };
          this.auditLog = [];
          return this.run(); // Retry recursive
        } catch (sanitizeError) {
          throw new Error(`Gagal sanitasi file: ${sanitizeError.message}`);
        }
      }
      throw error;
    }
  }

  async _processWorkbookData(workbook) {
    let bestSheet = null;
    let headerMap = {};
    let headerRowIdx = 0;
    let maxScore = 0;

    // Tambahkan 'status' ke goldenKeys agar deteksi header lebih akurat
    const allGoldenKeys = [...this.goldenKeys, "status"];

    workbook.eachSheet((sheet) => {
      const limit = 25; // Cek 25 baris pertama untuk mencari header
      const maxRow = Math.min(sheet.rowCount, limit);

      for (let r = 1; r <= maxRow; r++) {
        const row = sheet.getRow(r);
        const currentMap = {};
        let score = 0;

        // Optimasi: Cek hanya jika row punya value
        if (!row.hasValues) continue;

        row.eachCell((cell, colNumber) => {
          const rawVal = this._getCellValue(cell);
          const norm = this._normalizeHeaderClean(rawVal);
          if (!norm) return;
          currentMap[norm] = colNumber;

          // Scoring system: +1 jika kolom dikenal, +5 jika kolom kunci
          if (this.mapper.knownColumns.includes(norm)) score++;
          if (allGoldenKeys.includes(norm)) score += 5;
        });
        if (score > maxScore) {
          maxScore = score;
          bestSheet = sheet;
          headerRowIdx = r;
          headerMap = currentMap;
        }
      }
    });

    if (!bestSheet || maxScore < 2) {
      Logger.error(`Gagal Header. Max Score: ${maxScore}`, null, this.parserTag);
      throw new Error("LOW_HEADER_SCORE");
    }

    Logger.info(
      `Header: Row ${headerRowIdx} @ Sheet "${bestSheet.name}"`,
      this.parserTag
    );

    const orders = new Map();
    let processedCount = 0;

    bestSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= headerRowIdx) return;

      // Helper untuk mengambil nilai cell berdasarkan variasi nama kolom
      const getter = (keys) => {
        for (const k of keys) {
          const normK = this._normalizeHeaderClean(k);
          const colIdx = headerMap[normK];
          if (colIdx) {
            const cell = row.getCell(colIdx);
            return this._getCellValue(cell);
          }
        }
        return "";
      };

      this._processRow(getter, orders, rowNumber);
      processedCount++;
    });

    if (processedCount === 0) throw new Error("FORCE_SANITIZE");
    return { orders, headerRowIdx };
  }

  _processRow(getter, orders, rowNumber) {
    const data = this.mapper.extract(getter);

    if (!data || !data.invoiceId) {
      const fallbackId = getter([
        "order id",
        "no pesanan",
        "no. pesanan",
        "nomor tagihan",
        "*nomor tagihan",
      ]);
      if (
        fallbackId &&
        (fallbackId.includes("Platform unique") || fallbackId.includes("unique order"))
      ) {
        return; // Skip tanpa error
      }

      const hasContent = this.mapper.knownColumns.some((col) => !!getter([col]));
      if (hasContent) {
        const msg =
          this.source === "MassPriceUpdate"
            ? "SKU atau Harga tidak valid/kosong"
            : "Gagal ambil ID Pesanan/Invoice";

        this.stats.failed++;
        this.auditLog.push({
          row: rowNumber,
          sku: "UNKNOWN",
          message: msg,
        });
      }
      return;
    }

    if (!data.sku) {
      data.sku = "MISSING-SKU";
      this.auditLog.push({
        row: rowNumber,
        sku: "MISSING-SKU",
        message: "SKU Kosong/Tidak Terbaca",
      });
    }

    this.stats.totalRows++;

    // 3. Cek Status
    const status = this.mapper.getStatus(getter);
    const rawStatus = getter(["status", "order status", "status pesanan", "status transaksi"]);

    if (status === "IGNORE") {
      this.stats.skippedStatus++;
      this.auditLog.push({
        row: rowNumber,
        invoiceId: data.invoiceId,
        customer: data.customer,
        sku: data.sku,
        qty: data.qty,
        status: rawStatus || "-",
        message: `SKIPPED: Status '${rawStatus}' tidak diproses.`,
      });
      return;
    }

    // Masukkan ke Map (Grouping by Invoice ID)
    if (!orders.has(data.invoiceId)) {
      orders.set(data.invoiceId, { ...data, status, items: [] });
    }

    orders.get(data.invoiceId).items.push({
      sku: data.sku,
      qty: data.qty || 1,
      returnedQty: data.returnedQty || 0,
      status: status,
      locationId: null,
      row: rowNumber,
    });

    this.stats.success++;
  }

  _getCellValue(cell) {
    return getSafeStr(cell);
  }
}

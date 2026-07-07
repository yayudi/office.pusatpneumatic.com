/* eslint-disable no-console */
// backend/utils/logger.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dayjs from "dayjs"; // Menggunakan dayjs dari fix sebelumnya untuk timestamp lokal yang konsisten

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.join(__dirname, "../logs");

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Cek env, jika production matikan debug log
const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Standardized Central Logger untuk Backend
 */
class Logger {
  /**
   * @param {string} level
   * @param {string} context
   * @param {string} message
   */
  static #formatMessage(level, context, message) {
    const timestamp = dayjs().format("YYYY-MM-DD HH:mm:ss");
    const ctxString = context ? `[${context}]` : "";
    return `[${timestamp}] [${level}] ${ctxString} ${message}`;
  }

  static #writeToFile(folder, fileName, content) {
    try {
      const targetDir = path.join(logDir, folder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.appendFileSync(path.join(targetDir, fileName), content + "\n\n");
    } catch (err) {
      console.error("Logger Failed to write to file:", err);
    }
  }

  /**
   * Sanitizes sensitive keys recursively in an object to prevent leakage.
   * @param {any} data
   * @param {WeakSet} [seen]
   * @returns {any}
   */
  static #sanitize(data, seen = new WeakSet()) {
    if (!data || typeof data !== "object") {
      return data;
    }

    if (data instanceof Error) {
      return data;
    }

    if (seen.has(data)) {
      return "[Circular]";
    }
    seen.add(data);

    if (Array.isArray(data)) {
      return data.map((item) => this.#sanitize(item, seen));
    }

    const sensitiveKeys = [
      "password", "password_hash", "token", "secret", "jwt",
      "pin", "authorization", "cookie", "pass", "newpassword",
      "oldpassword", "kredensial"
    ];

    const cleanObj = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sKey) => lowerKey.includes(sKey))) {
        cleanObj[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        cleanObj[key] = this.#sanitize(value, seen);
      } else {
        cleanObj[key] = value;
      }
    }
    return cleanObj;
  }

  static #printObj(data) {
    if (!data) return "";
    try {
      const cleanData = this.#sanitize(data);
      return `\nData: ${JSON.stringify(cleanData, null, 2)}`;
    } catch {
      return `\nData: [Circular/Non-serializable]`;
    }
  }

  /**
   * Pruning otomatis file log yang sudah melewati masa retensi (daysToKeep)
   * Berguna untuk mencegah habisnya inode/disk space di shared hosting.
   * @param {number} daysToKeep
   */
  static pruneOldLogs(daysToKeep = 60) {
    try {
      const now = Date.now();
      const cutoffTime = now - daysToKeep * 24 * 60 * 60 * 1000;
      const folders = ["app", "error"];

      let deletedCount = 0;

      folders.forEach((folder) => {
        const targetDir = path.join(logDir, folder);
        if (!fs.existsSync(targetDir)) return;

        const files = fs.readdirSync(targetDir);
        files.forEach((file) => {
          if (!file.endsWith(".log")) return;

          const filePath = path.join(targetDir, file);
          const stats = fs.statSync(filePath);

          // Hapus jika file lebih tua dari cutoff
          if (stats.mtimeMs < cutoffTime) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        });
      });

      if (deletedCount > 0) {
        this.info(`Berhasil menghapus ${deletedCount} file log lama (> ${daysToKeep} hari)`, "LOGGER_SYSTEM");
      }
    } catch (err) {
      console.error("Logger Failed to prune old logs:", err);
    }
  }

  static #getDailyFileName(prefix) {
    return `${prefix}-${dayjs().format("YYYY-MM-DD")}.log`;
  }

  /**
   * @param {string} message
   * @param {string} [context="INFO"]
   * @param {any} [data=null]
   */
  static info(message, context = "INFO", data = null) {
    const msg = this.#formatMessage("INFO", context, message);
    const cleanData = this.#sanitize(data);
    const fullMsg = msg + this.#printObj(cleanData);

    console.log(`\x1b[36m%s\x1b[0m`, msg); // Cyan
    if (cleanData) console.dir(cleanData, { depth: 2, colors: true });

    this.#writeToFile("app", this.#getDailyFileName("app"), fullMsg);
  }

  /**
   * @param {string} message
   * @param {string} [context="WARN"]
   * @param {any} [data=null]
   */
  static warn(message, context = "WARN", data = null) {
    const msg = this.#formatMessage("WARN", context, message);
    const cleanData = this.#sanitize(data);
    const fullMsg = msg + this.#printObj(cleanData);

    console.warn(`\x1b[33m%s\x1b[0m`, msg); // Yellow
    if (cleanData) console.dir(cleanData, { depth: 2, colors: true });

    this.#writeToFile("app", this.#getDailyFileName("app"), fullMsg);
    this.#writeToFile("error", this.#getDailyFileName("error"), fullMsg);
  }

  /**
   * @param {string} message
   * @param {Error|any} [error=null]
   * @param {string} [context="ERROR"]
   */
  static error(message, error = null, context = "ERROR") {
    const msg = this.#formatMessage("ERROR", context, message);
    const cleanError = this.#sanitize(error);
    const errorDetails = error instanceof Error
      ? `\nMessage: ${error.message}\nStack: ${error.stack}`
      : this.#printObj(cleanError);

    const fullMsg = msg + errorDetails;

    console.error(`\x1b[31m%s\x1b[0m`, msg); // Red
    if (cleanError) console.error(cleanError);

    this.#writeToFile("app", this.#getDailyFileName("app"), fullMsg);
    this.#writeToFile("error", this.#getDailyFileName("error"), fullMsg);
  }

  /**
   * Digunakan untuk trace & debug. Tidak akan diprint di production environment.
   * @param {string} message
   * @param {string} [context="DEBUG"]
   * @param {any} [data=null]
   */
  static debug(message, context = "DEBUG", data = null) {
    if (IS_PROD) return;

    const msg = this.#formatMessage("DEBUG", context, message);
    const cleanData = this.#sanitize(data);
    console.log(`\x1b[90m%s\x1b[0m`, msg); // Gray/Dim
    if (cleanData) console.dir(cleanData, { depth: 2, colors: true });

    // Debug tidak ditulis ke file untuk menghemat IOPS di shared hosting
  }
}

// ⚠️ Backward Compatibility untuk fungsi logger lama (agar tidak error)
export const logDebug = (message, data = null) => {
  Logger.debug(message, "LEGACY", data);
};

// Eksekusi pruning secara background 10 detik setelah logger di-load (agar tidak memblokir startup)
// Retensi diatur default ke 30 hari untuk hemat disk space di shared hosting
setTimeout(() => {
  Logger.pruneOldLogs(30);
}, 10000);

export default Logger;

// backend/utils/AppError.js

/**
 * Kelas kustom untuk menangani error operasional dengan status HTTP dan error code spesifik.
 * Sangat berguna bersama Global Error Handling Middleware.
 */
class AppError extends Error {
  /**
   * @param {string} message - Pesan error yang dapat dibaca manusia (akan dikirim ke frontend)
   * @param {number} statusCode - HTTP Status Code (misal: 400, 401, 404, 500)
   * @param {string} errorCode - Kode spesifik aplikasi (misal: "VALIDATION_ERROR", "INSUFFICIENT_STOCK")
   */
  constructor(message, statusCode = 500, errorCode = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // Menandakan ini error yang diprediksi (bukan bug sistem murni)

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;

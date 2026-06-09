import AppError from "../utils/AppError.js";

/**
 * Middleware untuk memvalidasi input request menggunakan Zod schema.
 * @param {import("zod").AnyZodObject} schema - Skema Zod
 * @param {string} source - Sumber data (body, query, params)
 */
export const validate = (schema, source = "body") => {
  return async (req, res, next) => {
    try {
      // Validasi data
      const parsedData = await schema.parseAsync(req[source]);
      
      // Timpa data original dengan data yang sudah di-parse dan di-cast oleh Zod
      req[source] = parsedData;
      
      next();
    } catch (error) {
      // Menangkap error dari Zod
      if (error.name === "ZodError") {
        // Gabungkan semua pesan error Zod
        const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
        return next(new AppError(messages, 400, "VALIDATION_ERROR"));
      }
      next(error);
    }
  };
};

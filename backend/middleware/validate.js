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
      if (error && error.name === "ZodError") {
        // Gabungkan semua pesan error Zod
        const errList = error.errors || error.issues || [];
        const messages = errList.map((err) => {
            const path = err.path ? err.path.join(".") : "field";
            return `${path}: ${err.message}`;
        }).join(", ");
        return next(new AppError(messages, 400, "VALIDATION_ERROR"));
      }
      next(error);
    }
  };
};

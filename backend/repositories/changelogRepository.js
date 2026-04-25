import db from "../config/db.js";

/**
 * Mengambil semua catatan changelog, diurutkan dari yang terbaru.
 * @returns {Promise<Array>}
 */
export const getChangelogs = async () => {
  const [rows] = await db.query(
    "SELECT * FROM system_changelogs ORDER BY release_date DESC, id DESC"
  );
  return rows;
};

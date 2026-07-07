/**
 * Utility functions for Media handling
 */

/**
 * Strips the extension from a filename.
 * @param {string} filename
 * @returns {string}
 */
export const stripExtension = (filename) => {
  if (!filename) return "";
  return filename.replace(/\.[^/.]+$/, "");
};

/**
 * Checks if a title is generic (e.g. 'image', 'photo', 'whatsapp').
 * @param {string} title
 * @returns {boolean}
 */
export const isGenericTitle = (title) => {
  if (!title || !title.trim()) return true;
  const lower = title.trim().toLowerCase();

  // Jika hanya berupa angka (misal: "1", "1234", "01"), dianggap generik
  if (/^\d+$/.test(lower)) return true;

  const genericKeywords = [
    "image",
    "images",
    "gambar",
    "img",
    "photo",
    "pic",
    "untitled",
    "whatsapp",
    "telegram",
    "screenshot",
    "capture",
    "dcim",
    "picture",
    "snip",
    "blob",
  ];
  return genericKeywords.some((kw) => lower.includes(kw));
};



/**
 * Checks if a MIME type is allowed for media assets.
 * @param {string} mimeType
 * @returns {boolean}
 */
export const isAllowedMimeType = (mimeType) => {
  if (!mimeType) return false;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  return allowedTypes.includes(mimeType.toLowerCase());
};

/**
 * Utility functions for general file handling
 */

/**
 * Generates a safe and clean filename.
 * Removes special characters, replaces spaces with dashes, and converts to lowercase.
 * @param {string} originalName 
 * @returns {string}
 */
export const generateSafeFilename = (originalName) => {
  if (!originalName) return "";
  return originalName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/[^a-z0-9.-]/g, ""); // Remove non-alphanumeric except dots and dashes
};

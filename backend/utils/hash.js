import crypto from 'crypto';

/**
 * Calculates SHA-256 hash of a buffer
 * @param {Buffer} buffer - Data buffer
 * @returns {string} - Hex string of SHA-256 hash
 */
export const calcHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

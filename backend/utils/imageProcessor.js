import os from 'os';
import Logger from './logger.js';

let vipsInstance = null;

const initVips = async () => {
  if (!vipsInstance) {
    // --- WORKAROUND UNTUK SHARED HOSTING (EAGAIN / LIMIT THREAD) ---
    const originalCpus = os.cpus;
    os.cpus = () => [{}]; 
    process.env.VIPS_CONCURRENCY = '1';
    process.env.UV_THREADPOOL_SIZE = '1';

    const { default: Vips } = await import('wasm-vips');
    
    os.cpus = originalCpus;
    // -------------------------------------------------------------
    
    vipsInstance = await Vips();
  }
  return vipsInstance;
};

/**
 * Strips EXIF and other metadata from an image buffer
 * @param {Buffer} buffer - Original image buffer
 * @returns {Promise<{ buffer: Buffer, width: number, height: number }>} - Cleaned image buffer and dimensions
 */
export const stripExif = async (buffer) => {
  try {
    const vips = await initVips();
    // Load image from buffer
    const image = vips.Image.newFromBuffer(buffer);
    
    // Remove profile/metadata if present
    const cleanImage = image.copy();
    // Removing metadata by converting to buffer without keeping profile
    const cleanBuffer = cleanImage.writeToBuffer('.jpeg', { Q: 90, profile: 'none' });
    
    const width = cleanImage.width;
    const height = cleanImage.height;
    
    image.delete();
    cleanImage.delete();
    
    return { buffer: cleanBuffer, width, height };
  } catch (err) {
    Logger.error("Error stripping EXIF", err, "IMAGE_PROCESSOR");
    // Fallback to original buffer if vips fails for some reason
    // In this fallback, we won't have dimensions easily unless we use another lib
    // We return zeros to signify failure to read dimensions
    return { buffer, width: 0, height: 0 };
  }
};

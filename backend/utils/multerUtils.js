import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateSafeFilename } from './fileUtils.js';

/**
 * Creates a configured multer diskStorage instance.
 * Automatically ensures the target directory exists and safely formats filenames.
 * 
 * @param {string} destinationPath - The absolute or relative path to store files.
 * @param {string} prefix - A prefix for the filename (e.g. 'raw', 'package-update').
 * @returns {multer.StorageEngine}
 */
export const createDiskStorage = (destinationPath, prefix = '') => {
  // Ensure directory exists
  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const safeName = generateSafeFilename(path.parse(file.originalname).name);
      
      const filePrefix = prefix ? `${prefix}-` : '';
      cb(null, `${filePrefix}${uniqueSuffix}-${safeName}${path.extname(file.originalname)}`);
    }
  });
};

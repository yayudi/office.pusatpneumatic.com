import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDiskStorage } from '../utils/multerUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads', 'imports');

const storage = createDiskStorage(uploadDir);

const fileFilter = (req, file, cb) => {
  // Accept Excel and CSV files
  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.mimetype === 'text/csv' ||
    file.originalname.match(/\.(xlsx|xls|csv)$/)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file Excel (.xlsx, .xls) atau CSV yang diperbolehkan!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export default upload;

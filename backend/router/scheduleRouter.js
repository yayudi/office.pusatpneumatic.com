import express from 'express';
import * as scheduleController from '../controllers/scheduleController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', scheduleController.getSchedules);
router.post('/', scheduleController.createSchedule);
router.delete('/', scheduleController.deleteSchedule);

// Import Routes
router.get('/template', scheduleController.downloadTemplate);
// Multer middleware usually needed here for file upload
import upload from '../middleware/uploadMiddleware.js'; // Assuming common upload middleware
router.post('/import', upload.single('file'), scheduleController.uploadImportSchedule);

export default router;

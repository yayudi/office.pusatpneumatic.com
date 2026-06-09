import express from 'express';
import * as scheduleController from '../controllers/scheduleController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();
import { validate } from '../middleware/validate.js';
import { createScheduleSchema, getSchedulesSchema, deleteScheduleSchema } from '../validators/hrisValidator.js';

router.use(authenticateToken);

router.get('/', validate(getSchedulesSchema, 'query'), scheduleController.getSchedules);
router.post('/', validate(createScheduleSchema), scheduleController.createSchedule);
router.delete('/', validate(deleteScheduleSchema, 'query'), scheduleController.deleteSchedule);

// Import Routes
router.get('/template', scheduleController.downloadTemplate);
// Multer middleware usually needed here for file upload
import upload from '../middleware/uploadMiddleware.js'; // Assuming common upload middleware
router.post('/import', upload.single('file'), scheduleController.uploadImportSchedule);

export default router;

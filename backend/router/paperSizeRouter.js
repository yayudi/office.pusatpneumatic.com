import express from 'express';
import * as paperSizeController from '../controllers/paperSizeController.js';
import authenticateToken from '../middleware/authMiddleware.js';
import { canAccess } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, paperSizeController.getAllPaperSizes);
router.get('/:id', authenticateToken, paperSizeController.getPaperSizeById);

// Hanya admin / yang punya izin manage-users yang bisa merubah
router.post('/', authenticateToken, canAccess('manage-users'), paperSizeController.createPaperSize);
router.put('/:id', authenticateToken, canAccess('manage-users'), paperSizeController.updatePaperSize);
router.delete('/:id', authenticateToken, canAccess('manage-users'), paperSizeController.deletePaperSize);

export default router;

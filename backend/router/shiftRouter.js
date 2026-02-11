import express from 'express';
import * as shiftController from '../controllers/shiftController.js';
// import { verifyToken } from '../middleware/authMiddleware.js'; // Ensure auth is protected

const router = express.Router();

// router.use(verifyToken); // Apply to all routes

router.get('/', shiftController.getShifts);
router.get('/:id', shiftController.getShift);
router.post('/', shiftController.createShift);
router.put('/:id', shiftController.updateShift);
router.delete('/:id', shiftController.deleteShift);

export default router;

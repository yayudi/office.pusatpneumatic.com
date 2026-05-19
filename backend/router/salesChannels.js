// backend/router/salesChannels.js
import express from 'express';
import {
  getAllChannels,
  getChannelById,
  createChannel,
  updateChannel,
  deleteChannel
} from '../controllers/salesChannelController.js';
import authenticateToken from '../middleware/authMiddleware.js';
import { canAccess } from '../middleware/permissionMiddleware.js';

const router = express.Router();

// Gunakan permission 'products.view' atau permission lain yang cocok.
// Idealnya kita punya 'sales_channels.view', tapi untuk kemudahan kita gunakan ini dulu.
router.get('/', authenticateToken, getAllChannels);
router.get('/:id', authenticateToken, getChannelById);

router.post('/', authenticateToken, canAccess('manage-products'), createChannel);
router.put('/:id', authenticateToken, canAccess('manage-products'), updateChannel);
router.delete('/:id', authenticateToken, canAccess('manage-products'), deleteChannel);

export default router;

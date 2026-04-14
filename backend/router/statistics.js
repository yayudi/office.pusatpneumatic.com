// backend/router/statistics.js
import express from 'express';
import { getStockMovements, requestStockMovementsExport, getInventoryValue } from '../controllers/statisticController.js';
import authenticateToken from '../middleware/authMiddleware.js';
import { canAccess } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.get('/stock-movements', authenticateToken, canAccess('statistic.stock.view'), getStockMovements);
router.post('/stock-movements/export', authenticateToken, canAccess('statistic.stock.export'), requestStockMovementsExport);
router.get('/inventory-value', authenticateToken, canAccess('statistic.stock.view'), getInventoryValue);

export default router;

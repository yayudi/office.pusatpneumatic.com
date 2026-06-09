// backend/router/statistics.js
import express from 'express';
import { getStockMovements, requestStockMovementsExport, getInventoryValue, getStockTimeline, requestStockTimelineExport, getShopPerformance } from '../controllers/statisticController.js';
import authenticateToken from '../middleware/authMiddleware.js';
import { canAccess } from '../middleware/permissionMiddleware.js';

const router = express.Router();
import { validate } from '../middleware/validate.js';
import { stockMovementsSchema, stockTimelineExportSchema } from '../validators/statisticsValidator.js';

router.get('/stock-movements', authenticateToken, canAccess('statistic.stock.view'), validate(stockMovementsSchema, 'query'), getStockMovements);
router.post('/stock-movements/export', authenticateToken, canAccess('statistic.stock.export'), validate(stockMovementsSchema), requestStockMovementsExport);
router.get('/inventory-value', authenticateToken, canAccess('statistic.stock.view'), getInventoryValue);
router.get('/stock-timeline', authenticateToken, canAccess('statistic.stock.view'), getStockTimeline);
router.post('/stock-timeline/export', authenticateToken, canAccess('statistic.stock.export'), validate(stockTimelineExportSchema), requestStockTimelineExport);
router.get('/shop-performance', authenticateToken, canAccess('statistic.stock.view'), validate(stockMovementsSchema, 'query'), getShopPerformance);

export default router;

// backend/controllers/statisticController.js
import * as statisticService from '../services/statisticService.js';
import db from '../config/db.js';
import * as jobRepo from '../repositories/jobRepository.js';

export const getStockMovements = async (req, res) => {
  try {
    const { startDate, endDate, searchQuery, status, movement, building, timeResolution, categoryId } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate dan endDate diperlukan.' });
    }

    let buildingsArray = [];
    if (building) {
      buildingsArray = Array.isArray(building) ? building : building.split(',');
    }

    const filters = {
      startDate,
      endDate,
      searchQuery,
      status,
      movement,
      buildings: buildingsArray,
      timeResolution,
      categoryId
    };

    const data = await statisticService.getStockMovementStatistics(filters);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getStockMovements:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat statistik stok.' });
  }
};

export const requestStockMovementsExport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, searchQuery, status, movement, building, categoryId } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate dan endDate diperlukan.' });
    }

    const filters = {
      startDate,
      endDate,
      searchQuery,
      status,
      movement,
      buildings: building, // array if passed from UI usually
      categoryId,
      exportType: "STATISTICS_STOCK_MOVEMENT"
    };

    const jobId = await jobRepo.createExportJob(db, {
      userId,
      filters,
      jobType: "STATISTICS_STOCK_MOVEMENT"
    });

    res.status(202).json({
      success: true,
      message: "Permintaan ekspor statistik stok diterima. File sedang diproses.",
      jobId,
    });
  } catch (error) {
    console.error("Error at requestStockMovementsExport:", error);
    res.status(500).json({ success: false, message: "Gagal membuat permintaan ekspor." });
  }
};

export const getStockTimeline = async (req, res) => {
  try {
    const { searchQuery, building, status, movement } = req.query;

    let buildingsArray = [];
    if (building) {
      buildingsArray = Array.isArray(building) ? building : building.split(',');
    }

    const filters = {
      searchQuery,
      status,
      movement,
      buildings: buildingsArray,
    };

    const data = await statisticService.getStockTimelineStatistics(filters);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error getStockTimeline:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat statistik timeline stok.' });
  }
};

export const requestStockTimelineExport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { searchQuery, building, status, movement } = req.body;

    if (!searchQuery) {
      return res.status(400).json({ success: false, message: 'searchQuery diperlukan.' });
    }

    const filters = {
      searchQuery,
      status: status || 'all',
      movement: movement || 'all',
      buildings: building || [],
      exportType: 'STATISTICS_STOCK_TIMELINE',
    };

    const jobId = await jobRepo.createExportJob(db, {
      userId,
      filters,
      jobType: 'STATISTICS_STOCK_TIMELINE',
    });

    res.status(202).json({
      success: true,
      message: 'Permintaan ekspor statistik timeline stok diterima. File sedang diproses.',
      jobId,
    });
  } catch (error) {
    console.error('Error requestStockTimelineExport:', error);
    res.status(500).json({ success: false, message: 'Gagal membuat permintaan ekspor.' });
  }
};

export const getInventoryValue = async (req, res) => {
  try {
    const { searchQuery, building, purpose, isPackage, stockStatus, categoryId } = req.query;

    let buildingsArray = [];
    if (building) {
      buildingsArray = Array.isArray(building) ? building : building.split(',');
    }

    const filters = {
      searchQuery,
      building: buildingsArray,
      purpose,
      isPackage,
      stockStatus,
      categoryId
    };

    const data = await statisticService.getInventoryValueStatistics(filters);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getInventoryValue:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat statistik nilai inventaris.' });
  }
};

export const getShopPerformance = async (req, res) => {
  try {
    const { startDate, endDate, source, shopName, prevStartDate, prevEndDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate dan endDate diperlukan.' });
    }

    const filters = { startDate, endDate, source, shopName, prevStartDate, prevEndDate };
    const data = await statisticService.getShopPerformanceStats(filters);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getShopPerformance:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat statistik performa toko.' });
  }
};

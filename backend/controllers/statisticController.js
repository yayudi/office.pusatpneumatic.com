// backend/controllers/statisticController.js
import * as statisticService from "../services/statisticService.js";
import db from "../config/db.js";
import * as jobRepo from "../repositories/jobRepository.js";
export const getStockMovements = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      searchQuery,
      status,
      movement,
      building,
      timeResolution,
      categoryId,
    } = req.query;

    let buildingsArray = [];
    if (building) {
      if (typeof building === "object" && !Array.isArray(building)) {
        buildingsArray = building;
      } else {
        buildingsArray = Array.isArray(building) ? building : building.split(",");
      }
    }

    const filters = {
      startDate,
      endDate,
      searchQuery,
      status,
      movement,
      buildings: buildingsArray,
      timeResolution,
      categoryId,
    };

    const data = await statisticService.getStockMovementStatistics(filters);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const requestStockMovementsExport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, searchQuery, status, movement, building, categoryId } = req.body;

    const filters = {
      startDate,
      endDate,
      searchQuery,
      status,
      movement,
      buildings: building, // array if passed from UI usually
      categoryId,
      exportType: "STATISTICS_STOCK_MOVEMENT",
    };

    const jobId = await jobRepo.createExportJob(db, {
      userId,
      filters,
      jobType: "STATISTICS_STOCK_MOVEMENT",
    });

    res.status(202).json({
      success: true,
      message: "Permintaan ekspor statistik stok diterima. File sedang diproses.",
      jobId,
    });
  } catch (error) {
    next(error);
  }
};

export const getStockTimeline = async (req, res, next) => {
  try {
    const { searchQuery, building, status, movement } = req.query;

    let buildingsArray = [];
    if (building) {
      if (typeof building === "object" && !Array.isArray(building)) {
        buildingsArray = building;
      } else {
        buildingsArray = Array.isArray(building) ? building : building.split(",");
      }
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
    next(error);
  }
};

export const requestStockTimelineExport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { searchQuery, building, status, movement } = req.body;

    const filters = {
      searchQuery,
      status: status || "all",
      movement: movement || "all",
      buildings: building || [],
      exportType: "STATISTICS_STOCK_TIMELINE",
    };

    const jobId = await jobRepo.createExportJob(db, {
      userId,
      filters,
      jobType: "STATISTICS_STOCK_TIMELINE",
    });

    res.status(202).json({
      success: true,
      message: "Permintaan ekspor statistik timeline stok diterima. File sedang diproses.",
      jobId,
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryValue = async (req, res, next) => {
  try {
    const { searchQuery, building, purpose, isPackage, stockStatus, categoryId } = req.query;

    let buildingsArray = [];
    if (building) {
      if (typeof building === "object" && !Array.isArray(building)) {
        buildingsArray = building;
      } else {
        buildingsArray = Array.isArray(building) ? building : building.split(",");
      }
    }

    const filters = {
      searchQuery,
      building: buildingsArray,
      purpose,
      isPackage,
      stockStatus,
      categoryId,
    };

    const data = await statisticService.getInventoryValueStatistics(filters);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getShopPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate, source, shopName, prevStartDate, prevEndDate } = req.query;

    const filters = { startDate, endDate, source, shopName, prevStartDate, prevEndDate };
    const data = await statisticService.getShopPerformanceStats(filters);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

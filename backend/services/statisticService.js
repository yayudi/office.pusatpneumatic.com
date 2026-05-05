// backend/services/statisticService.js
import * as statisticRepo from '../repositories/statisticRepository.js';
import db from "../config/db.js";
import ExcelJS from "exceljs";
import fs from "fs";
import { fileURLToPath } from "url";

/**
 * @param {string} startDate
 * @param {string} endDate
 */
export const getStockMovementStatistics = async (filters) => {
  const { startDate, endDate, status: filterStatus, movement: filterMovement, building, searchQuery, timeResolution } = filters;
  let connection;
  try {
    connection = await db.getConnection();

    // Fetch data paralel
    const [rows, timelineRows] = await Promise.all([
      statisticRepo.getStockMovementStats(connection, filters),
      statisticRepo.getMovementTimelineStats(connection, filters)
    ]);

    // Calculate Days Diff to find Avg Daily Sales
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    // Add 1 to include both start and end dates
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 || 1;

    let data = rows.map(row => {
      const avgDailySales = Number(row.total_sold) / days;
      const currentStock = Number(row.current_stock);
      const daysOfInventory = avgDailySales > 0 ? (currentStock / avgDailySales) : -1;

      let status = 'SAFE';

      // Stok 0 atau minus dianggap CRITICAL
      if (currentStock < 0) {
        status = 'NEGATIVE';
      } else if (currentStock === 0) {
        status = 'EMPTY';
      } else if (daysOfInventory >= 0 && daysOfInventory <= 7) {
        status = 'CRITICAL';
      } else if (daysOfInventory > 7 && daysOfInventory <= 14) {
        status = 'WARNING';
      } else if (daysOfInventory === -1 && currentStock > 0 && currentStock >= 100) {
        status = 'OVERSTOCK';
      } else {
        status = 'SAFE';
      }

      return {
        ...row,
        current_stock: currentStock,
        total_sold: Number(row.total_sold),
        total_inbound: Number(row.total_inbound),
        avg_daily_sales: Number(avgDailySales.toFixed(2)),
        days_of_inventory: daysOfInventory >= 0 ? Number(daysOfInventory.toFixed(1)) : null,
        status
      };
    });

    if (filterStatus && filterStatus !== 'all') {
      data = data.filter(item => item.status === filterStatus.toUpperCase());
    }

    if (filterMovement && filterMovement !== 'all') {
      if (filterMovement === 'active') {
        data = data.filter(item => item.total_sold > 0 || item.total_inbound > 0);
      } else if (filterMovement === 'dead') {
        data = data.filter(item => item.total_sold === 0 && item.total_inbound === 0);
      }
    }

    // Format timeline dates nicely (e.g. YYYY-MM-DD to handle local time offsets) preserving string
    const timeline = timelineRows.map(t => ({
      date: t.date,
      total_out: Number(t.total_out),
      total_in: Number(t.total_in)
    }));

    return {
      summary: data,
      timeline: timeline
    };
  } finally {
    if (connection) connection.release();
  }
};

export const getStockTimelineStatistics = async (filters) => {
  const { searchQuery, building, status, movement } = filters;
  let connection;
  try {
    connection = await db.getConnection();
    const rows = await statisticRepo.getMovementTimelineStats(connection, filters);

    // Map to expected format with totals
    const data = rows.map(row => ({
      date: row.date,
      totalIn: Number(row.total_in),
      totalOut: Number(row.total_out),
      netChange: Number(row.total_in) - Number(row.total_out)
    }));

    return data;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @param {Object} filters
 */
export const getInventoryValueStatistics = async (filters) => {
  let connection;
  try {
    connection = await db.getConnection();
    const rows = await statisticRepo.getInventoryValueStats(connection, filters);

    // Calculate global total
    let globalTotalValue = 0;
    rows.forEach(row => {
      globalTotalValue += Number(row.total_value);
    });

    const data = rows.map(row => {
      const percentage = globalTotalValue > 0 ? (Number(row.total_value) / globalTotalValue) * 100 : 0;

      let status;
      if (Number(row.total_quantity) === 0) {
        status = 'EMPTY';
      } else if (Number(row.total_quantity) < 0) {
        status = 'NEGATIVE';
      } else if (Number(row.total_quantity) > 100) {
        status = 'OVERSTOCK';
      } else if (Number(row.total_quantity) > 50 && Number(row.total_quantity) < 100) {
        status = 'WARNING';
      } else if (Number(row.total_quantity) > 0 && Number(row.total_quantity) < 50) {
        status = 'CRITICAL';
      } else {
        status = 'SAFE';
      }

      return {
        ...row,
        total_quantity: Number(row.total_quantity),
        total_value: Number(row.total_value),
        percentage: Number(percentage.toFixed(2)),
        status
      };
    });

    return data;
  } finally {
    if (connection) connection.release();
  }
};


export const generateStatisticExport = async (filters, filePath) => {
  console.log(`[StatisticExport] Starting export to: ${filePath}`);
  const stream = fs.createWriteStream(filePath);
  const workbookWriter = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: stream,
    useStyles: true,
    useSharedStrings: true,
  });

  const styleHeaderLocal = (ws, rowNumber, colCount, bgColor = "FFD9E1F2", fontColor = "FF000000") => {
    const row = ws.getRow(rowNumber);
    row.height = 20;
    for (let i = 1; i <= colCount; i++) {
      const cell = row.getCell(i);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.font = { bold: true, color: { argb: fontColor } };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
    row.commit();
  };

  const writeDataToSheet = (sheetName, data) => {
    // Ensure sheet name is valid for Excel (max 31 chars, no invalid chars)
    const safeSheetName = String(sheetName).substring(0, 31).replace(/[\\/?*[\]]/g, '-');
    const sheet = workbookWriter.addWorksheet(safeSheetName);

    const headers = [
      "SKU", "Nama Produk", "Status", "Stok Saat Ini", "Total Terjual", "Total Masuk", "Rata-rata Terjual Harian", "Estimasi Hari Stok"
    ];

    sheet.columns = [
      { key: "sku", width: 15 },
      { key: "name", width: 40 },
      { key: "status", width: 15 },
      { key: "current_stock", width: 15 },
      { key: "total_sold", width: 15 },
      { key: "total_inbound", width: 15 },
      { key: "avg_daily_sales", width: 25 },
      { key: "days_of_inventory", width: 20 },
    ];

    sheet.getRow(1).values = headers;
    styleHeaderLocal(sheet, 1, headers.length, "FF4472C4", "FFFFFFFF");

    for (const row of data) {
      sheet.addRow({
        sku: row.sku,
        name: row.name,
        status: row.status,
        current_stock: row.current_stock,
        total_sold: row.total_sold,
        total_inbound: row.total_inbound,
        avg_daily_sales: row.avg_daily_sales,
        days_of_inventory: row.days_of_inventory !== null ? row.days_of_inventory : "N/A"
      }).commit();
    }

    sheet.commit();
  };

  try {
    // 1. Tulis Sheet Global (Gabungan semua lokasi yang di-filter)
    const globalStats = await getStockMovementStatistics(filters);
    writeDataToSheet("Statistik Global", globalStats.summary || []);

    // 2. Buat Sheet Tambahan per Gedung (jika user memfilter gedung)
    if (filters.buildings && Array.isArray(filters.buildings) && filters.buildings.length > 0) {
      for (const building of filters.buildings) {
        // Ambil data spesifik hanya untuk gedung ini
        const specificFilters = { ...filters, buildings: [building] };
        const buildingStats = await getStockMovementStatistics(specificFilters);

        writeDataToSheet(`${building}`, buildingStats.summary || []);
      }
    }

    await workbookWriter.commit();

    await new Promise((resolve, reject) => {
      if (stream.writableEnded || stream.destroyed) return resolve();
      stream.on("finish", resolve);
      stream.on("error", reject);
      stream.on("close", resolve);
    });

    console.log("[StatisticExport] Finished.");
  } catch (error) {
    console.error("[StatisticExport] Error:", error);
    try { stream.end(); } catch (e) { }
    throw error;
  }
};

/**
 * Fetch comprehensive Shop Performance Statistics.
 * Returns 5 datasets: summary, dailyTrend, topProducts, fulfillment, comparison.
 * @param {Object} filters { startDate, endDate, source, shopName, prevStartDate, prevEndDate }
 * @returns {Promise<{summary: Array, dailyTrend: Array, topProducts: Array, fulfillment: Array, comparison: Object}>}
 */
export const getShopPerformanceStats = async (filters) => {
  let connection;
  try {
    connection = await db.getConnection();

    const queries = [
      statisticRepo.getShopPerformanceStats(connection, filters),
      statisticRepo.getDailySalesTrend(connection, filters),
      statisticRepo.getTopSellingProducts(connection, { ...filters, limit: 10 }),
      statisticRepo.getFulfillmentHealth(connection, filters),
    ];

    // Only run comparison if previous dates are provided
    if (filters.prevStartDate && filters.prevEndDate) {
      queries.push(statisticRepo.getPeriodComparison(connection, filters));
    }

    const results = await Promise.all(queries);
    const [summaryRows, trendRows, topRows, healthRows] = results;
    const comparisonRows = results[4] || [];

    const summary = summaryRows.map(row => ({
      ...row,
      total_orders: Number(row.total_orders),
      total_items_sold: Number(row.total_items_sold),
      total_revenue: Number(row.total_revenue),
    }));

    const dailyTrend = trendRows.map(row => ({
      date: row.date,
      totalOrders: Number(row.total_orders),
      totalItemsSold: Number(row.total_items_sold),
      totalRevenue: Number(row.total_revenue),
    }));

    const topProducts = topRows.map(row => ({
      source: row.source,
      shopName: row.shop_name,
      sku: row.sku,
      productName: row.product_name,
      totalSold: Number(row.total_sold),
      revenue: Number(row.revenue),
    }));

    const fulfillment = healthRows.map(row => {
      const total = Number(row.total_orders);
      const completed = Number(row.completed_orders);
      const cancelled = Number(row.cancelled_orders);
      const returned = Number(row.returned_orders);
      const pending = Number(row.pending_orders);

      return {
        source: row.source,
        shopName: row.shop_name,
        totalOrders: total,
        completedOrders: completed,
        cancelledOrders: cancelled,
        returnedOrders: returned,
        pendingOrders: pending,
        completionRate: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
        cancellationRate: total > 0 ? Number(((cancelled / total) * 100).toFixed(1)) : 0,
        returnRate: total > 0 ? Number(((returned / total) * 100).toFixed(1)) : 0,
      };
    });

    // Build comparison object
    const currentRow = comparisonRows.find(r => r.period === 'current');
    const previousRow = comparisonRows.find(r => r.period === 'previous');
    const calcDelta = (curr, prev) => prev > 0 ? Number((((curr - prev) / prev) * 100).toFixed(1)) : (curr > 0 ? 100 : 0);

    const comparison = {
      current: {
        totalOrders: currentRow ? Number(currentRow.total_orders) : 0,
        totalItemsSold: currentRow ? Number(currentRow.total_items_sold) : 0,
        totalRevenue: currentRow ? Number(currentRow.total_revenue) : 0,
      },
      previous: {
        totalOrders: previousRow ? Number(previousRow.total_orders) : 0,
        totalItemsSold: previousRow ? Number(previousRow.total_items_sold) : 0,
        totalRevenue: previousRow ? Number(previousRow.total_revenue) : 0,
      },
      delta: {
        orders: calcDelta(
          currentRow ? Number(currentRow.total_orders) : 0,
          previousRow ? Number(previousRow.total_orders) : 0
        ),
        items: calcDelta(
          currentRow ? Number(currentRow.total_items_sold) : 0,
          previousRow ? Number(previousRow.total_items_sold) : 0
        ),
        revenue: calcDelta(
          currentRow ? Number(currentRow.total_revenue) : 0,
          previousRow ? Number(previousRow.total_revenue) : 0
        ),
      },
    };

    return { summary, dailyTrend, topProducts, fulfillment, comparison };
  } catch (error) {
    console.error("Error in getShopPerformanceStats:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};


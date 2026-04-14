// backend/services/statisticService.js
import * as statisticRepo from '../repositories/statisticRepository.js';
import db from '../config/db.js';

/**
 * @param {string} startDate
 * @param {string} endDate
 */
export const getStockMovementStatistics = async (filters) => {
  const { startDate, endDate, status: filterStatus, movement: filterMovement } = filters;
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
      const daysOfInventory = avgDailySales > 0 ? (currentStock / avgDailySales) : -1; // -1 means infinite/no sales
      
      let status = 'SAFE';
      if (daysOfInventory >= 0 && daysOfInventory <= 7) {
        status = 'CRITICAL';
      } else if (daysOfInventory > 7 && daysOfInventory <= 14) {
        status = 'WARNING';
      } else if (daysOfInventory === -1 && currentStock > 0 && currentStock >= 100) {
        status = 'OVERSTOCK'; // Optionally map slow-moving large stocks
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
      date: typeof t.date === 'string' ? t.date : window?.moment ? t.date : new Date(t.date).toISOString().split('T')[0], // ensure format
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
      
      let status = 'SAFE';
      if (Number(row.total_quantity) < 0) {
        status = 'NEGATIVE';
      } else if (Number(row.total_quantity) === 0) {
        status = 'EMPTY';
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

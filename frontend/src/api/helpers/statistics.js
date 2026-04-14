// frontend/src/api/helpers/statistics.js
import api from '../axios.js';

/**
 * Fetch stock movement statistics
 * @param {Object} filters Filter params (startDate, endDate, searchQuery, status, movement, building)
 * @returns {Promise<Array>} Array of statistic data
 */
export const getStockMovementStatistics = async (filters) => {
  try {
    const { data } = await api.get('/statistics/stock-movements', {
      params: filters
    });
    return data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

/**
 * Fetch inventory value statistics
 * @param {Object} filters Filter params
 * @returns {Promise<Array>} Array of statistic data
 */
export const getInventoryValueStatistics = async (filters) => {
  try {
    const { data } = await api.get('/statistics/inventory-value', {
      params: filters
    });
    return data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

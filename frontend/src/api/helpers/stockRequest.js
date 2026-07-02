// frontend/src/api/helpers/stockRequest.js
import axios from '../axios'

/**
 * Mengambil daftar permintaan stok
 * @param {object} params - Filter parameter (opsional)
 * @returns {Promise<Array>}
 */
export async function fetchStockRequests(params = {}) {
  try {
    const response = await axios.get('/stock-requests', { params })
    return response.data
  } catch (error) {
    console.error('Error fetching stock requests:', error.response?.data || error.message)
    throw error.response?.data || error
  }
}

/**
 * Membuat permintaan stok baru
 * @param {object} payload - { fromLocationId, toLocationId, notes, items: [{ productId, quantity }] }
 * @returns {Promise<object>}
 */
export async function createStockRequest(payload) {
  try {
    const response = await axios.post('/stock-requests', payload)
    return response.data
  } catch (error) {
    console.error('Error creating stock request:', error.response?.data || error.message)
    throw error.response?.data || error
  }
}

/**
 * Approve permintaan stok
 * @param {number} id - ID stock_request
 * @returns {Promise<object>}
 */
export async function approveStockRequest(id) {
  try {
    const response = await axios.post(`/stock-requests/${id}/approve`)
    return response.data
  } catch (error) {
    console.error('Error approving stock request:', error.response?.data || error.message)
    throw error.response?.data || error
  }
}

/**
 * Reject permintaan stok
 * @param {number} id - ID stock_request
 * @returns {Promise<object>}
 */
export async function rejectStockRequest(id) {
  try {
    const response = await axios.post(`/stock-requests/${id}/reject`)
    return response.data
  } catch (error) {
    console.error('Error rejecting stock request:', error.response?.data || error.message)
    throw error.response?.data || error
  }
}

/**
 * Complete (Menerima) permintaan stok
 * @param {number} id - ID stock_request
 * @param {Array<{productId, receivedQuantity}>} receivedItems - Item yang diterima secara fisik
 * @returns {Promise<object>}
 */
export async function completeStockRequest(id, receivedItems) {
  try {
    const response = await axios.post(`/stock-requests/${id}/complete`, { receivedItems })
    return response.data
  } catch (error) {
    console.error('Error completing stock request:', error.response?.data || error.message)
    throw error.response?.data || error
  }
}

/**
 * Memproses aksi massal pada permintaan stok
 * @param {string} action - 'APPROVE' atau 'REJECT'
 * @param {Array<number>} requestIds - Array dari ID stock_request
 * @returns {Promise<object>}
 */
export async function bulkActionStockRequests(action, requestIds) {
  try {
    const response = await axios.post('/stock-requests/bulk-action', { action, requestIds })
    return response.data
  } catch (error) {
    console.error('Error in bulk action stock requests:', error.response?.data || error.message)
    throw error.response?.data || error
  }
}

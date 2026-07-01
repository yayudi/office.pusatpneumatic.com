import * as paperSizeRepository from '../repositories/paperSizeRepository.js';

/**
 * Format paper size data dari database (snake_case -> camelCase)
 */
const formatData = (item) => ({
  id: item.id,
  name: item.name,
  topMargin: parseFloat(item.top_margin),
  sideMargin: parseFloat(item.side_margin),
  verticalPitch: parseFloat(item.vertical_pitch),
  horizontalPitch: parseFloat(item.horizontal_pitch),
  labelWidth: parseFloat(item.label_width),
  labelHeight: parseFloat(item.label_height),
  numberAcross: parseInt(item.number_across),
  numberDown: parseInt(item.number_down),
  pageWidth: parseFloat(item.page_width),
  pageHeight: parseFloat(item.page_height),
  isActive: item.is_active === 1,
  createdAt: item.created_at,
  updatedAt: item.updated_at
});

/**
 * Format data input (camelCase -> snake_case)
 */
const formatInput = (data) => ({
  name: data.name,
  top_margin: data.topMargin,
  side_margin: data.sideMargin,
  vertical_pitch: data.verticalPitch,
  horizontal_pitch: data.horizontalPitch,
  label_width: data.labelWidth,
  label_height: data.labelHeight,
  number_across: data.numberAcross,
  number_down: data.numberDown,
  page_width: data.pageWidth,
  page_height: data.pageHeight
});

/**
 * Mengambil semua data ukuran kertas
 * @returns {Promise<Array>}
 */
export const getAllPaperSizes = async () => {
  const rows = await paperSizeRepository.getAllPaperSizes();
  return rows.map(formatData);
};

/**
 * Mengambil data ukuran kertas berdasarkan ID
 * @param {number} id
 * @returns {Promise<Object>}
 */
export const getPaperSizeById = async (id) => {
  const item = await paperSizeRepository.getPaperSizeById(id);
  if (!item) throw new Error('Ukuran kertas tidak ditemukan');
  return formatData(item);
};

/**
 * Menyimpan data ukuran kertas baru
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
export const createPaperSize = async (data) => {
  const formattedInput = formatInput(data);
  const newId = await paperSizeRepository.createPaperSize(formattedInput);
  return await getPaperSizeById(newId);
};

/**
 * Mengupdate data ukuran kertas
 * @param {number} id 
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
export const updatePaperSize = async (id, data) => {
  const formattedInput = formatInput(data);
  const success = await paperSizeRepository.updatePaperSize(id, formattedInput);
  if (!success) throw new Error('Gagal memperbarui ukuran kertas atau data tidak ditemukan');
  return await getPaperSizeById(id);
};

/**
 * Menghapus data ukuran kertas
 * @param {number} id 
 * @returns {Promise<boolean>}
 */
export const deletePaperSize = async (id) => {
  const success = await paperSizeRepository.deletePaperSize(id);
  if (!success) throw new Error('Gagal menghapus ukuran kertas atau data tidak ditemukan');
  return true;
};

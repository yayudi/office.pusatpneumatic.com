import * as paperSizeService from '../services/paperSizeService.js';
import Logger from '../utils/logger.js';

export const getAllPaperSizes = async (req, res) => {
  try {
    const data = await paperSizeService.getAllPaperSizes();
    return res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data paper size',
      data
    });
  } catch (error) {
    Logger.error('[PaperSizeController] Error getAllPaperSizes:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data paper size'
    });
  }
};

export const getPaperSizeById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await paperSizeService.getPaperSizeById(id);
    return res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail paper size',
      data
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

export const createPaperSize = async (req, res) => {
  try {
    const { 
      name, topMargin, sideMargin, verticalPitch, horizontalPitch,
      labelWidth, labelHeight, numberAcross, numberDown, pageWidth, pageHeight 
    } = req.body;

    if (!name || labelWidth === undefined || labelHeight === undefined || pageWidth === undefined || pageHeight === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, labelWidth, labelHeight, pageWidth, dan pageHeight wajib diisi'
      });
    }

    const data = await paperSizeService.createPaperSize({ 
      name, topMargin, sideMargin, verticalPitch, horizontalPitch,
      labelWidth, labelHeight, numberAcross, numberDown, pageWidth, pageHeight
    });

    return res.status(201).json({
      success: true,
      message: 'Berhasil membuat paper size',
      data
    });
  } catch (error) {
    Logger.error('[PaperSizeController] Error createPaperSize:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Gagal membuat paper size'
    });
  }
};

export const updatePaperSize = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, topMargin, sideMargin, verticalPitch, horizontalPitch,
      labelWidth, labelHeight, numberAcross, numberDown, pageWidth, pageHeight 
    } = req.body;

    if (!name || labelWidth === undefined || labelHeight === undefined || pageWidth === undefined || pageHeight === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, labelWidth, labelHeight, pageWidth, dan pageHeight wajib diisi'
      });
    }

    const data = await paperSizeService.updatePaperSize(id, {
      name, topMargin, sideMargin, verticalPitch, horizontalPitch,
      labelWidth, labelHeight, numberAcross, numberDown, pageWidth, pageHeight
    });

    return res.status(200).json({
      success: true,
      message: 'Berhasil memperbarui paper size',
      data
    });
  } catch (error) {
    Logger.error('[PaperSizeController] Error updatePaperSize:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Gagal memperbarui paper size'
    });
  }
};

export const deletePaperSize = async (req, res) => {
  try {
    const { id } = req.params;
    await paperSizeService.deletePaperSize(id);
    return res.status(200).json({
      success: true,
      message: 'Berhasil menghapus paper size'
    });
  } catch (error) {
    Logger.error('[PaperSizeController] Error deletePaperSize:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Gagal menghapus paper size'
    });
  }
};

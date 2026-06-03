import * as service from "../services/stickerTemplateService.js";
import Logger from "../utils/logger.js";

/**
 * Mendapatkan semua template
 */
export const getAllTemplates = async (req, res) => {
  try {
    const templates = await service.fetchAllTemplates();
    res.status(200).json({
      success: true,
      message: "Berhasil mengambil data template",
      data: templates
    });
  } catch (error) {
    Logger.error("GET_ALL_TEMPLATES_ERROR", error, "TEMPLATE_CTRL");
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data template",
      error_code: "INTERNAL_ERROR"
    });
  }
};

/**
 * Membuat template baru
 */
export const createTemplate = async (req, res) => {
  try {
    const { name, paper_size, config_json } = req.body;
    
    if (!name || !config_json) {
      return res.status(400).json({
        success: false,
        message: "Nama dan konfigurasi template wajib diisi",
        error_code: "VALIDATION_ERROR"
      });
    }

    const newId = await service.createTemplate({ name, paper_size, config_json });
    
    res.status(201).json({
      success: true,
      message: "Template berhasil disimpan",
      data: { id: newId }
    });
  } catch (error) {
    Logger.error("CREATE_TEMPLATE_ERROR", error, "TEMPLATE_CTRL");
    res.status(500).json({
      success: false,
      message: error.message || "Gagal menyimpan template",
      error_code: "INTERNAL_ERROR"
    });
  }
};

/**
 * Menghapus template
 */
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await service.removeTemplate(Number(id));
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Template tidak ditemukan",
        error_code: "NOT_FOUND"
      });
    }

    res.status(200).json({
      success: true,
      message: "Template berhasil dihapus",
      data: null
    });
  } catch (error) {
    Logger.error("DELETE_TEMPLATE_ERROR", error, "TEMPLATE_CTRL");
    res.status(500).json({
      success: false,
      message: "Gagal menghapus template",
      error_code: "INTERNAL_ERROR"
    });
  }
};

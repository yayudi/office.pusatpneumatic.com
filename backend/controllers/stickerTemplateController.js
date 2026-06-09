import * as service from "../services/stickerTemplateService.js";
import AppError from "../utils/AppError.js";
/**
 * Mendapatkan semua template
 */
export const getAllTemplates = async (req, res, next) => {
  try {
    const templates = await service.fetchAllTemplates();
    res.status(200).json({
      success: true,
      message: "Berhasil mengambil data template",
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Membuat template baru
 */
export const createTemplate = async (req, res, next) => {
  try {
    const { name, paper_size, config_json } = req.body;

    const newId = await service.createTemplate({ name, paper_size, config_json });

    res.status(201).json({
      success: true,
      message: "Template berhasil disimpan",
      data: { id: newId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Menghapus template
 */
export const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await service.removeTemplate(Number(id));

    if (!success) {
      return next(new AppError("Template tidak ditemukan", 404));
    }

    res.status(200).json({
      success: true,
      message: "Template berhasil dihapus",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Memperbarui template
 */
export const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, paper_size, config_json } = req.body;

    const success = await service.editTemplate(Number(id), { name, paper_size, config_json });

    if (!success) {
      return next(new AppError("Template tidak ditemukan", 404));
    }

    res.status(200).json({
      success: true,
      message: "Template berhasil diperbarui",
      data: { id: Number(id) },
    });
  } catch (error) {
    next(error);
  }
};

import catchAsync from "../utils/catchAsync.js";
import * as service from "../services/stickerTemplateService.js";
import AppError from "../utils/AppError.js";
/**
 * Mendapatkan semua template
 */
export const getAllTemplates = catchAsync(async (req, res, next) => {
  const templates = await service.fetchAllTemplates();
  res.status(200).json({
    success: true,
    message: "Berhasil mengambil data template",
    data: templates,
  });
});

/**
 * Membuat template baru
 */
export const createTemplate = catchAsync(async (req, res, next) => {
  const { name, paper_size, config_json } = req.body;

  const newId = await service.createTemplate({ name, paper_size, config_json });

  res.status(201).json({
    success: true,
    message: "Template berhasil disimpan",
    data: { id: newId },
  });
});

/**
 * Menghapus template
 */
export const deleteTemplate = catchAsync(async (req, res, next) => {
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
});

/**
 * Memperbarui template
 */
export const updateTemplate = catchAsync(async (req, res, next) => {
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
});

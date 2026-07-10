import catchAsync from "../utils/catchAsync.js";
// backend/controllers/salesChannelController.js
import * as salesChannelService from "../services/salesChannelService.js";

export const getAllChannels = catchAsync(async (req, res, next) => {
  // jika query ?activeOnly=true, maka hanya kembalikan yang aktif
  const activeOnly = req.query.activeOnly === "true";
  const channels = await salesChannelService.getAllChannels(activeOnly);
  res.json({
    success: true,
    data: channels,
  });
});

export const getChannelById = catchAsync(async (req, res, next) => {
  const channel = await salesChannelService.getChannelById(req.params.id);
  res.json({
    success: true,
    data: channel,
  });
});

export const createChannel = catchAsync(async (req, res, next) => {
  const userId = req.user?.id || 1;
  const { platform, name, description, isActive } = req.body;

  // Default isActive to true if not provided
  const channelData = {
    platform,
    name,
    description,
    isActive: isActive !== undefined ? isActive : true,
  };

  const newId = await salesChannelService.createChannel(channelData, userId);

  res.status(201).json({
    success: true,
    message: "Saluran penjualan berhasil ditambahkan.",
    data: { id: newId },
  });
});

export const updateChannel = catchAsync(async (req, res, next) => {
  const userId = req.user?.id || 1;
  const { platform, name, description, isActive } = req.body;
  const channelData = { platform, name, description, isActive };

  await salesChannelService.updateChannel(req.params.id, channelData, userId);

  res.json({
    success: true,
    message: "Saluran penjualan berhasil diperbarui.",
  });
});

export const deleteChannel = catchAsync(async (req, res, next) => {
  const userId = req.user?.id || 1;
  await salesChannelService.deleteChannel(req.params.id, userId);

  res.json({
    success: true,
    message: "Saluran penjualan berhasil dihapus.",
  });
});

// backend/controllers/salesChannelController.js
import * as salesChannelService from "../services/salesChannelService.js";

export const getAllChannels = async (req, res, next) => {
  try {
    // jika query ?activeOnly=true, maka hanya kembalikan yang aktif
    const activeOnly = req.query.activeOnly === "true";
    const channels = await salesChannelService.getAllChannels(activeOnly);
    res.json({
      success: true,
      data: channels,
    });
  } catch (error) {
    next(error);
  }
};

export const getChannelById = async (req, res, next) => {
  try {
    const channel = await salesChannelService.getChannelById(req.params.id);
    res.json({
      success: true,
      data: channel,
    });
  } catch (error) {
    next(error);
  }
};

export const createChannel = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

export const updateChannel = async (req, res, next) => {
  try {
    const userId = req.user?.id || 1;
    const { platform, name, description, isActive } = req.body;
    const channelData = { platform, name, description, isActive };

    await salesChannelService.updateChannel(req.params.id, channelData, userId);

    res.json({
      success: true,
      message: "Saluran penjualan berhasil diperbarui.",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChannel = async (req, res, next) => {
  try {
    const userId = req.user?.id || 1;
    await salesChannelService.deleteChannel(req.params.id, userId);

    res.json({
      success: true,
      message: "Saluran penjualan berhasil dihapus.",
    });
  } catch (error) {
    next(error);
  }
};

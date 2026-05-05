// backend/controllers/salesChannelController.js
import * as salesChannelService from '../services/salesChannelService.js';

export const getAllChannels = async (req, res) => {
  try {
    // jika query ?activeOnly=true, maka hanya kembalikan yang aktif
    const activeOnly = req.query.activeOnly === 'true';
    const channels = await salesChannelService.getAllChannels(activeOnly);
    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil data saluran penjualan.' });
  }
};

export const getChannelById = async (req, res) => {
  try {
    const channel = await salesChannelService.getChannelById(req.params.id);
    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message || 'Saluran penjualan tidak ditemukan.' });
  }
};

export const createChannel = async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { platform, name, description, isActive } = req.body;
    
    // Default isActive to true if not provided
    const channelData = {
      platform,
      name,
      description,
      isActive: isActive !== undefined ? isActive : true
    };

    const newId = await salesChannelService.createChannel(channelData, userId);
    
    res.status(201).json({
      success: true,
      message: 'Saluran penjualan berhasil ditambahkan.',
      data: { id: newId }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Gagal menambahkan saluran penjualan.' });
  }
};

export const updateChannel = async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { platform, name, description, isActive } = req.body;
    const channelData = { platform, name, description, isActive };

    await salesChannelService.updateChannel(req.params.id, channelData, userId);
    
    res.json({
      success: true,
      message: 'Saluran penjualan berhasil diperbarui.'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Gagal memperbarui saluran penjualan.' });
  }
};

export const deleteChannel = async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    await salesChannelService.deleteChannel(req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Saluran penjualan berhasil dihapus.'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Gagal menghapus saluran penjualan.' });
  }
};

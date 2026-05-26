import * as notificationService from '../services/notificationService.js';
import Logger from '../utils/logger.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getRecentUnread = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
    
    const data = await notificationService.fetchRecentUnread(userId, limit);
    res.json({ success: true, message: "Recent notifications fetched", data });
  } catch (error) {
    Logger.error("Get recent notifications error", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const filterType = req.query.type || 'ALL';
    
    const data = await notificationService.fetchAll(userId, filterType);
    res.json({ success: true, message: "Notifications fetched", data });
  } catch (error) {
    Logger.error("Get all notifications error", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    if (notificationId === 'all') {
      await notificationService.markAllNotificationsAsRead(userId);
    } else {
      await notificationService.markNotificationAsRead(notificationId, userId);
    }
    
    res.json({ success: true, message: "Marked as read" });
  } catch (error) {
    Logger.error("Mark notification read error", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const data = await notificationService.fetchPreferences(userId);
    res.json({ success: true, message: "Preferences fetched", data });
  } catch (error) {
    Logger.error("Get preferences error", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;
    
    if (!Array.isArray(preferences)) {
      return res.status(400).json({ success: false, message: "Invalid preferences format" });
    }
    
    await notificationService.updatePreferences(userId, preferences);
    res.json({ success: true, message: "Preferences updated successfully" });
  } catch (error) {
    Logger.error("Update preferences error", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

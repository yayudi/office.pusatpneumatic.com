import catchAsync from "../utils/catchAsync.js";
import * as notificationService from '../services/notificationService.js';
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getRecentPending = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
  
  const data = await notificationService.fetchRecentPending(userId, limit);
  res.json({ success: true, message: "Recent pending notifications fetched", data });
});

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getAll = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const filterType = req.query.type || 'ALL';
  
  const data = await notificationService.fetchAll(userId, filterType);
  res.json({ success: true, message: "Notifications fetched", data });
});

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const markAsDone = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const notificationId = req.params.id;
  
  if (notificationId === 'all') {
    await notificationService.markAllNotificationsAsDone(userId);
  } else {
    await notificationService.markNotificationAsDone(notificationId, userId);
  }
  
  res.json({ success: true, message: "Marked as done" });
});

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getPreferences = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  const data = await notificationService.fetchPreferences(userId);
  res.json({ success: true, message: "Preferences fetched", data });
});

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const updatePreferences = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { preferences } = req.body;
  

  await notificationService.updatePreferences(userId, preferences);
  res.json({ success: true, message: "Preferences updated successfully" });
});

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const claimNotification = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const notificationId = req.params.id;
  
  const success = await notificationService.claimNotification(notificationId, userId);
  
  if (success) {
    res.json({ success: true, message: "Tugas berhasil diambil" });
  } else {
    res.status(400).json({ success: false, message: "Tugas sudah diambil oleh orang lain atau sudah selesai" });
  }
});

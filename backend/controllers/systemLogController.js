import catchAsync from "../utils/catchAsync.js";
import * as logRepo from "../repositories/systemLogRepository.js";
export const getSystemLogs = catchAsync(async (req, res, next) => {
  const { page, limit, search, action, targetType, userId, startDate, endDate } = req.query;

  const result = await logRepo.getLogs({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    search,
    action,
    targetType,
    userId,
    startDate,
    endDate
  });

  res.json({ success: true, ...result });
});

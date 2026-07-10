import catchAsync from "../utils/catchAsync.js";
// backend/controllers/statsController.js
import { getKpiSummary } from "../services/statsService.js";
export const fetchKpiSummary = catchAsync(async (req, res, next) => {
  const kpiData = await getKpiSummary();
  res.status(200).json({ success: true, data: kpiData });
});

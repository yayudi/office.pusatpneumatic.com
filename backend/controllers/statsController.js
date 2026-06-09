// backend/controllers/statsController.js
import { getKpiSummary } from "../services/statsService.js";
export const fetchKpiSummary = async (req, res, next) => {
  try {
    const kpiData = await getKpiSummary();
    res.status(200).json({ success: true, data: kpiData });
  } catch (error) {
    next(error);
  }
};

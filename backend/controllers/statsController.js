// backend/controllers/statsController.js
import { getKpiSummary } from "../services/statsService.js";
import Logger from "../utils/logger.js";

export const fetchKpiSummary = async (req, res) => {
  try {
    const kpiData = await getKpiSummary();
    res.status(200).json({ success: true, data: kpiData });
  } catch (error) {
    Logger.error("Error di statsController fetchKpiSummary", error, "STATS_CONTROLLER");
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data ringkasan KPI.",
    });
  }
};

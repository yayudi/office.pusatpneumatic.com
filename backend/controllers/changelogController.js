import * as changelogService from "../services/changelogService.js";
import Logger from "../utils/logger.js";

export const getChangelogs = async (req, res) => {
  try {
    const data = await changelogService.fetchChangelogs();
    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil data changelog",
      data: data
    });
  } catch (error) {
    Logger.error("Error in getChangelogs", error, "CHANGELOG_CONTROLLER");
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data changelog",
      error_code: "INTERNAL_SERVER_ERROR"
    });
  }
};

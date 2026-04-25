import * as changelogService from "../services/changelogService.js";

export const getChangelogs = async (req, res) => {
  try {
    const data = await changelogService.fetchChangelogs();
    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil data changelog",
      data: data
    });
  } catch (error) {
    console.error("Error in getChangelogs:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data changelog",
      error_code: "INTERNAL_SERVER_ERROR"
    });
  }
};

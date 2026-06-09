// backend/controllers/changelogController.js
import * as changelogService from "../services/changelogService.js";
export const getChangelogs = async (req, res, next) => {
  try {
    const data = await changelogService.fetchChangelogs();
    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil data changelog",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

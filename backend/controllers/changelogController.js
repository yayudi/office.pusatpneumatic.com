// backend/controllers/changelogController.js
import catchAsync from "../utils/catchAsync.js";
import * as changelogService from "../services/changelogService.js";

export const getChangelogs = catchAsync(async (req, res, next) => {
  const data = await changelogService.fetchChangelogs();
  return res.status(200).json({
    success: true,
    message: "Berhasil mengambil data changelog",
    data: data,
  });
});

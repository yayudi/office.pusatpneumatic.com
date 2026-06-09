import db from "../config/db.js";
import * as jobRepo from "../repositories/jobRepository.js";
import * as productRepo from "../repositories/productRepository.js"; // For standard CRUD if needed
import AppError from "../utils/AppError.js";
// Helper: Get Base URL
const getBaseUrl = (req) => {
  return `${req.protocol}://${req.get("host")}`;
};

export const exportPackages = async (req, res, next) => {
  const { format, search, searchBy, status } = req.query;
  const userId = req.user?.id || 1; // Fallback to 1 if no user

  let connection;
  try {
    connection = await db.getConnection();

    // Create Job Filters
    const filters = {
      exportType: "EXPORT_PACKAGES", // Identified by queue
      format: format || "xlsx",
      search,
      searchBy,
      status,
    };

    // Create Job
    const jobId = await jobRepo.createExportJob(connection, {
      userId,
      filters,
      jobType: "EXPORT_PACKAGES",
    });

    res.json({
      success: true,
      message: "Export job created successfully",
      data: { jobId },
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

export const importPackagesBatch = async (req, res, next) => {
  // Phase 4 Implementation Placeholder
  // Enqueue IMPORT_PACKAGES job
  if (!req.file) {
      return next(new AppError("No file uploaded.", 400));
  }

  const userId = req.user?.id || 1;
  const filePath = req.file.path;
  const originalName = req.file.originalname;

  let connection;
  try {
      connection = await db.getConnection();

      // Create Import Job
      const jobId = await jobRepo.create(connection, {
          userId,
          jobType: "IMPORT_PACKAGES",
          filename: originalName,
          filePath: filePath,
          notes: "Batch Package Update"
      });

      res.json({
          success: true,
          message: "Import job created successfully",
          data: { jobId }
      });
  } catch (error) {
    next(error);
  } finally {
      if(connection) connection.release();
  }
};

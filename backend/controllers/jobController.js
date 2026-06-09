// backend/controllers/jobController.js
import db from "../config/db.js";
import * as jobRepo from "../repositories/jobRepository.js";
import Logger from "../utils/logger.js";

import AppError from "../utils/AppError.js";
/**
 * Get list of import jobs for the current user.
 */
export const getUserImportJobs = async (req, res, next) => {
  let connection;
  try {
    const userId = req.user.id;
    connection = await db.getConnection();

    const jobs = await jobRepo.findByUser(connection, userId, 20); // Limit 20

    // Parse error_log JSON if exists
    const formattedJobs = jobs.map((job) => {
      let errorLog = null;
      if (job.error_log) {
        try {
          errorLog = typeof job.error_log === "string" ? JSON.parse(job.error_log) : job.error_log;
        } catch (e) {
          Logger.warn(`Failed to parse error_log for job ${job.id}`, "JOB_CTRL", e);
        }
      }

      return {
        id: job.id,
        status: job.status,
        jobType: job.job_type,
        originalFilename: job.original_filename,
        summary: job.log_summary,
        errorLog: errorLog, // Contains download_url and errors array
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        retryCount: job.retry_count,
        processedRecords: job.processed_records,
        totalRecords: job.total_records,
      };
    });

    res.json({
      success: true,
      data: formattedJobs,
    });
  } catch (error) {
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Endpoint untuk memicu tugas latar belakang secara manual.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const triggerJob = async (req, res, next) => {
  const { task } = req.params;

  const allowedTasks = ["stock", "holidays"];
  if (!allowedTasks.includes(task)) {
    return next(new AppError("Tugas tidak valid.", 400));
  }

  try {
    const [result] = await db.query("INSERT INTO jobs (task_name, status) VALUES (?, 'pending')", [
      task,
    ]);

    Logger.info(
      `Tugas '${task}' berhasil ditambahkan ke antrian dengan ID: ${result.insertId}`,
      "JOB_CTRL",
    );

    res.status(202).json({
      success: true,
      message: `Tugas '${task}' telah ditambahkan ke antrian dan akan segera diproses.`,
    });
  } catch (error) {
    Logger.error(`Gagal menambahkan tugas '${task}' ke antrian`, error, "JOB_CTRL");
    return next(new AppError("Gagal memulai tugas.", 500));
  }
};

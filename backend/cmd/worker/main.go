package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dps-wmhris/backend/internal/config"
	"github.com/dps-wmhris/backend/internal/database"
	"github.com/dps-wmhris/backend/internal/repository"
	"github.com/dps-wmhris/backend/internal/service"
)

func main() {
	config.LoadConfig()

	db := database.ConnectDB()
	defer db.Close()

	jobRepo := repository.NewJobRepository(db)
	jobService := service.NewJobService(jobRepo)

	statisticRepo := repository.NewStatisticRepository(db)
	statisticService := service.NewStatisticService(statisticRepo, jobRepo)
	storageService := service.NewStorageService()
	exportService := service.NewExportService(jobRepo, statisticService, storageService)

	// In the future, we will inject other services like attendanceService to process the jobs
	attendanceRepo := repository.NewAttendanceRepository(db)
	userRepo := repository.NewUserRepository(db)
	shiftRepo := repository.NewShiftRepository(db)
	scheduleRepo := repository.NewScheduleRepository(db)
	attendanceService := service.NewAttendanceService(attendanceRepo, userRepo, shiftRepo, scheduleRepo)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Shutting down worker...")
		cancel()
	}()

	log.Println("Worker started. Polling for jobs...")

	pollInterval := 5 * time.Second
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("Worker stopped.")
			return
		case <-ticker.C:
			processPendingImportJobs(ctx, jobService, attendanceService)
			processPendingExportJobs(ctx, jobService, exportService)
		}
	}
}

func processPendingImportJobs(ctx context.Context, jobService service.JobService, attendanceService service.AttendanceService) {
	// Simple polling mechanism
	// In production, you'd want proper locking or `SELECT ... FOR UPDATE SKIP LOCKED`
	// Since there's only one worker instance intended, a simple fetch is fine for now
	jobs, err := jobService.GetImportJobs(ctx, 10, 0)
	if err != nil {
		log.Printf("Error fetching import jobs: %v", err)
		return
	}

	for _, job := range jobs {
		if job.Status == "PENDING" {
			log.Printf("Found PENDING import job: %d (%s)", job.ID, job.JobType)
			
			// Mark as PROCESSING
			err := jobService.UpdateImportJobStatus(ctx, job.ID, "PROCESSING")
			if err != nil {
				log.Printf("Failed to update job %d to PROCESSING: %v", job.ID, err)
				continue
			}

			// Execute Job
			var processErr error
			switch job.JobType {
			case "IMPORT_ATTENDANCE":
				log.Printf("Processing %s: %s", job.JobType, job.FilePath)
				processErr = attendanceService.ProcessImport(ctx, job.ID, job.FilePath, false)
			case "IMPORT_ATTENDANCE_DRY_RUN":
				log.Printf("Processing %s: %s", job.JobType, job.FilePath)
				processErr = attendanceService.ProcessImport(ctx, job.ID, job.FilePath, true)
			case "IMPORT_SCHEDULES":
				// TODO: call scheduleService.ProcessImport(...)
				log.Printf("Processing %s: %s", job.JobType, job.FilePath)
				time.Sleep(2 * time.Second)
			case "BATCH_EDIT_PRODUCT":
				log.Printf("Processing %s: %s", job.JobType, job.FilePath)
				time.Sleep(2 * time.Second) // TODO: Call productService.ProcessBatchUpdate(...)
			case "BATCH_EDIT_PRODUCT_DRY_RUN":
				log.Printf("Processing %s: %s", job.JobType, job.FilePath)
				time.Sleep(2 * time.Second)
			case "IMPORT_STOCK_INBOUND":
				log.Printf("Processing %s: %s", job.JobType, job.FilePath)
				time.Sleep(2 * time.Second) // TODO: Call stockService.ProcessImportBatchInbound(...)
			case "IMPORT_SALES_TOKOPEDIA", "IMPORT_SALES_SHOPEE", "IMPORT_SALES_TIKTOK", "IMPORT_SALES_MANUAL":
				log.Printf("Processing %s: %s", job.JobType, job.FilePath)
				time.Sleep(2 * time.Second) // TODO: Call pickingService.ProcessSalesImport(...)
			case "IMPORT_SALES_TOKOPEDIA_DRY_RUN", "IMPORT_SALES_SHOPEE_DRY_RUN", "IMPORT_SALES_TIKTOK_DRY_RUN", "IMPORT_SALES_MANUAL_DRY_RUN":
				log.Printf("Processing %s (Dry Run): %s", job.JobType, job.FilePath)
				time.Sleep(2 * time.Second)
			default:
				log.Printf("Unknown job type: %s", job.JobType)
			}

			if processErr != nil {
				log.Printf("Job %d failed: %v", job.ID, processErr)
				jobService.UpdateImportJobStatus(ctx, job.ID, "FAILED")
			} else {
				log.Printf("Job %d completed successfully", job.ID)
				jobService.UpdateImportJobStatus(ctx, job.ID, "COMPLETED")
			}
		}
	}
}

func processPendingExportJobs(ctx context.Context, jobService service.JobService, exportService service.ExportService) {
	jobs, err := jobService.GetExportJobs(ctx, 10, 0)
	if err != nil {
		log.Printf("Error fetching export jobs: %v", err)
		return
	}

	for _, job := range jobs {
		if job.Status == "PENDING" {
			log.Printf("Found PENDING export job: %d (%s)", job.ID, job.JobType)
			
			var processErr error
			filtersJSON := ""
			if job.Filters != nil {
				filtersJSON = *job.Filters
			}

			switch job.JobType {
			case "STATISTICS_STOCK_MOVEMENT":
				log.Printf("Processing %s", job.JobType)
				processErr = exportService.ProcessExportStockMovement(ctx, job.ID, filtersJSON)
			case "STATISTICS_STOCK_TIMELINE":
				log.Printf("Processing %s", job.JobType)
				processErr = exportService.ProcessExportStockTimeline(ctx, job.ID, filtersJSON)
			default:
				log.Printf("Unknown export job type: %s", job.JobType)
			}
			
			if processErr != nil {
				log.Printf("Export Job %d failed: %v", job.ID, processErr)
			} else {
				log.Printf("Export Job %d completed successfully", job.ID)
			}
		}
	}
}

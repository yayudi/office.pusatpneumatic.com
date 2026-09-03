package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/dps-wmhris/backend/internal/config"
	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AttendanceHandler struct {
	attendanceService service.AttendanceService
	jobService        service.JobService
}

func NewAttendanceHandler(attendanceService service.AttendanceService, jobService service.JobService) *AttendanceHandler {
	return &AttendanceHandler{
		attendanceService: attendanceService,
		jobService:        jobService,
	}
}

func (h *AttendanceHandler) GetIndexes(c *gin.Context) {
	indexes, err := h.attendanceService.GetIndexes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, indexes) // In Node.js, this returned raw indexes
}

func (h *AttendanceHandler) GetHistory(c *gin.Context) {
	var req dto.GetHistoryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "VALIDATION_ERROR"})
		return
	}

	data, err := h.attendanceService.GetHistory(c.Request.Context(), req.StartDate, req.EndDate, req.Search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *AttendanceHandler) GetRangeData(c *gin.Context) {
	var req dto.GetRangeDataRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "VALIDATION_ERROR"})
		return
	}

	data, err := h.attendanceService.GetRangeData(c.Request.Context(), req.StartDate, req.EndDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, data) // In Node.js, returned raw responseJson
}

func (h *AttendanceHandler) GetMonthlyData(c *gin.Context) {
	yearStr := c.Param("year")
	monthStr := c.Param("month")
	
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid year", "error_code": "VALIDATION_ERROR"})
		return
	}
	month, err := strconv.Atoi(monthStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid month", "error_code": "VALIDATION_ERROR"})
		return
	}

	data, err := h.attendanceService.GetMonthlyData(c.Request.Context(), year, month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *AttendanceHandler) UpdateLog(c *gin.Context) {
	var req dto.UpdateLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "VALIDATION_ERROR"})
		return
	}

	err := h.attendanceService.UpdateLog(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Data updated successfully"})
}

func (h *AttendanceHandler) UploadLogs(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "No file uploaded", "error_code": "VALIDATION_ERROR"})
		return
	}

	userID := getUserID(c)

	dryRunStr := c.PostForm("dryRun")
	isDryRun := dryRunStr == "true" || dryRunStr == "1"

	jobType := "IMPORT_ATTENDANCE"
	if isDryRun {
		jobType = "IMPORT_ATTENDANCE_DRY_RUN"
	}

	notes := c.PostForm("notes")
	defaultNotes := "Import Absensi"
	if isDryRun {
		defaultNotes = "Simulasi Import Absensi (Dry Run)"
	}
	finalNotes := defaultNotes
	if notes != "" {
		finalNotes = defaultNotes + " | " + notes
	}

	uploadDir := filepath.Join(config.AppConfig.StoragePath, "uploads", "attendance") + string(filepath.Separator)
	// Ensure directory exists
	os.MkdirAll(uploadDir, os.ModePerm)
	
	filepath := uploadDir + file.Filename
	
	if err := c.SaveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to save file", "error_code": "INTERNAL_ERROR"})
		return
	}

	req := dto.CreateImportJobRequest{
		UserID:           userID,
		JobType:          jobType,
		OriginalFilename: file.Filename,
		FilePath:         filepath,
		Notes:            &finalNotes,
	}

	jobID, err := h.jobService.CreateImportJob(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}

	msg := "File masuk antrian pemrosesan."
	if isDryRun {
		msg = "Simulasi validasi berjalan di background..."
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": msg,
		"jobId":   jobID,
	})
}

package handler

import (
	"net/http"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type ScheduleHandler struct {
	scheduleService service.ScheduleService
	jobService      service.JobService
}

func NewScheduleHandler(scheduleService service.ScheduleService, jobService service.JobService) *ScheduleHandler {
	return &ScheduleHandler{
		scheduleService: scheduleService,
		jobService:      jobService,
	}
}

func (h *ScheduleHandler) GetSchedules(c *gin.Context) {
	var req dto.GetSchedulesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "VALIDATION_ERROR"})
		return
	}

	schedules, err := h.scheduleService.GetSchedules(c.Request.Context(), req.UserID, req.StartDate, req.EndDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": schedules})
}

func (h *ScheduleHandler) CreateSchedule(c *gin.Context) {
	var req dto.CreateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "VALIDATION_ERROR"})
		return
	}

	// createdBy could be obtained from JWT token if available in context, for now we pass nil or parse it.
	// We'll extract UserID from context if middleware sets it. Assuming it's set as float64 by some JWT middlewares.
	var createdBy *int
	if userID, exists := c.Get("userID"); exists {
		if idF, ok := userID.(float64); ok {
			idInt := int(idF)
			createdBy = &idInt
		}
	}

	err := h.scheduleService.CreateSchedule(c.Request.Context(), req, createdBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Schedule saved"})
}

func (h *ScheduleHandler) DeleteSchedule(c *gin.Context) {
	var req dto.DeleteScheduleRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "VALIDATION_ERROR"})
		return
	}

	err := h.scheduleService.DeleteSchedule(c.Request.Context(), req.UserID, req.Date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Schedule deleted"})
}

func (h *ScheduleHandler) DownloadTemplate(c *gin.Context) {
	f, err := h.scheduleService.GenerateTemplate(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal generate template", "error_code": "INTERNAL_ERROR"})
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=Template_Jadwal_Shift.xlsx")
	
	if err := f.Write(c.Writer); err != nil {
		// Log error, but headers might already be sent
	}
}

func (h *ScheduleHandler) UploadImportSchedule(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "File Excel wajib diupload.", "error_code": "VALIDATION_ERROR"})
		return
	}

	// For simplicity, pretend userID is 1 for now since auth isn't fully ported
	// Replace with actual context user ID later
	userID := 1

	// Create temp directory for uploads if not exists
	uploadDir := "./storage/uploads/"
	filepath := uploadDir + file.Filename
	
	if err := c.SaveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to save file", "error_code": "INTERNAL_ERROR"})
		return
	}

	req := dto.CreateImportJobRequest{
		UserID:           userID,
		JobType:          "IMPORT_SCHEDULES",
		OriginalFilename: file.Filename,
		FilePath:         filepath,
	}

	jobID, err := h.jobService.CreateImportJob(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Import Jadwal sedang diproses di background.",
		"data": gin.H{
			"jobId": jobID,
		},
	})
}

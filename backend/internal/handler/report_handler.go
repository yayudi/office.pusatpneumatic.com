package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type ReportHandler struct {
	reportService service.ReportService
	jobService    service.JobService
}

func NewReportHandler(reportService service.ReportService, jobService service.JobService) *ReportHandler {
	return &ReportHandler{
		reportService: reportService,
		jobService:    jobService,
	}
}

func (h *ReportHandler) RequestStockReport(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna"})
		return
	}

	var filters map[string]interface{}
	if err := c.ShouldBindJSON(&filters); err != nil {
		filters = make(map[string]interface{})
	}
	
	filters["exportType"] = "STOCK_REPORT" // force exportType in filters

	filtersBytes, _ := json.Marshal(filters)
	filtersStr := string(filtersBytes)

	req := dto.CreateExportJobRequest{
		UserID:  userID,
		JobType: "STOCK_REPORT",
		Filters: &filtersStr,
	}

	jobID, err := h.jobService.CreateExportJob(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Permintaan ekspor diterima. Laporan sedang dibuat.",
		"jobId":   jobID,
	})
}

func (h *ReportHandler) GetUserExportJobs(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna"})
		return
	}

	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, c.Request.Host)

	jobs, err := h.reportService.GetUserExportJobs(c.Request.Context(), userID, baseURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": jobs})
}

func (h *ReportHandler) FetchReportFilters(c *gin.Context) {
	filters, err := h.reportService.GetReportFilters(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": filters})
}

package handler

import (
	"net/http"
	"strconv"

	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type JobHandler struct {
	jobService service.JobService
}

func NewJobHandler(jobService service.JobService) *JobHandler {
	return &JobHandler{jobService: jobService}
}

func (h *JobHandler) GetImportJobs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	jobs, err := h.jobService.GetImportJobs(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": jobs})
}

func (h *JobHandler) CancelImportJob(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID", "error_code": "VALIDATION_ERROR"})
		return
	}

	err = h.jobService.CancelImportJob(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "BAD_REQUEST"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Import job cancelled"})
}

func (h *JobHandler) GetExportJobs(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	jobs, err := h.jobService.GetExportJobs(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": jobs})
}

func (h *JobHandler) CancelExportJob(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID", "error_code": "VALIDATION_ERROR"})
		return
	}

	err = h.jobService.CancelExportJob(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "BAD_REQUEST"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Export job cancelled"})
}

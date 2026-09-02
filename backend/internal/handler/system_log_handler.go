package handler

import (
	"net/http"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type SystemLogHandler struct {
	systemLogService service.SystemLogService
}

func NewSystemLogHandler(systemLogService service.SystemLogService) *SystemLogHandler {
	return &SystemLogHandler{systemLogService: systemLogService}
}

func (h *SystemLogHandler) GetLogs(c *gin.Context) {
	var req dto.GetSystemLogsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format query string tidak valid",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	res, err := h.systemLogService.GetLogs(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil log sistem",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    res.Data,
		"total":   res.Total,
	})
}

package handler

import (
	"net/http"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type StatisticHandler struct {
	statisticService service.StatisticService
}

func NewStatisticHandler(statisticService service.StatisticService) *StatisticHandler {
	return &StatisticHandler{statisticService: statisticService}
}

func (h *StatisticHandler) GetStockMovements(c *gin.Context) {
	var filters dto.StatisticFilterRequest
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid query parameters"})
		return
	}

	data, err := h.statisticService.GetStockMovementStatistics(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *StatisticHandler) RequestStockMovementsExport(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	var req dto.ExportStatisticRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request body"})
		return
	}

	jobID, err := h.statisticService.RequestStockMovementsExport(c.Request.Context(), int(userID.(float64)), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"success": true,
		"message": "Permintaan ekspor statistik stok diterima. File sedang diproses.",
		"jobId":   jobID,
	})
}

func (h *StatisticHandler) GetStockTimeline(c *gin.Context) {
	var filters dto.StatisticFilterRequest
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid query parameters"})
		return
	}

	data, err := h.statisticService.GetStockTimelineStatistics(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *StatisticHandler) RequestStockTimelineExport(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	var req dto.ExportTimelineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request body"})
		return
	}

	jobID, err := h.statisticService.RequestStockTimelineExport(c.Request.Context(), int(userID.(float64)), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"success": true,
		"message": "Permintaan ekspor statistik timeline stok diterima. File sedang diproses.",
		"jobId":   jobID,
	})
}

func (h *StatisticHandler) GetInventoryValue(c *gin.Context) {
	var filters dto.StatisticFilterRequest
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid query parameters"})
		return
	}

	data, err := h.statisticService.GetInventoryValueStatistics(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *StatisticHandler) GetShopPerformance(c *gin.Context) {
	var filters dto.StatisticFilterRequest
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid query parameters"})
		return
	}

	data, err := h.statisticService.GetShopPerformanceStats(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *StatisticHandler) GetPackageAnalysis(c *gin.Context) {
	var filters dto.StatisticFilterRequest
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid query parameters"})
		return
	}

	if filters.StartDate == "" || filters.EndDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "startDate dan endDate wajib diisi"})
		return
	}

	data, err := h.statisticService.GetPackageComponentAnalysis(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func (h *StatisticHandler) GetLocationAnalysis(c *gin.Context) {
	var filters dto.StatisticFilterRequest
	if err := c.ShouldBindQuery(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid query parameters"})
		return
	}

	data, err := h.statisticService.GetLocationAnalysis(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

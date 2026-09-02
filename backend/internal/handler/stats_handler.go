package handler

import (
	"net/http"

	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type StatsHandler struct {
	statsService service.StatsService
}

func NewStatsHandler(statsService service.StatsService) *StatsHandler {
	return &StatsHandler{statsService: statsService}
}

func (h *StatsHandler) FetchKpiSummary(c *gin.Context) {
	kpiData, err := h.statsService.GetKpiSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": kpiData})
}

package handler

import (
	"net/http"
	"strconv"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type ReturnHandler struct {
	returnService service.ReturnService
}

func NewReturnHandler(returnService service.ReturnService) *ReturnHandler {
	return &ReturnHandler{returnService: returnService}
}

func (h *ReturnHandler) GetPendingReturns(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")

	offset := (page - 1) * limit

	params := map[string]interface{}{
		"limit":  limit,
		"offset": offset,
		"search": search,
	}

	rows, total, err := h.returnService.GetPendingReturns(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	totalPages := (total + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    rows,
		"pagination": map[string]interface{}{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

func (h *ReturnHandler) GetReturnHistory(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")

	offset := (page - 1) * limit

	params := map[string]interface{}{
		"limit":  limit,
		"offset": offset,
		"search": search,
	}

	marketplaceRows, marketplaceTotal, err := h.returnService.GetMarketplaceReturnHistory(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	manualRows, manualTotal, err := h.returnService.GetManualReturnHistory(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"marketplace_returns": marketplaceRows,
			"manual_returns":      manualRows,
		},
		"pagination": map[string]interface{}{
			"marketplace_total": marketplaceTotal,
			"manual_total":      manualTotal,
			"page":              page,
			"limit":             limit,
		},
	})
}

func (h *ReturnHandler) ApproveReturn(c *gin.Context) {
	var req dto.ApproveReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}

	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna"})
		return
	}

	err := h.returnService.ApproveReturn(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Retur berhasil diproses."})
}

func (h *ReturnHandler) CreateManualReturn(c *gin.Context) {
	var req dto.CreateManualReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}

	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna"})
		return
	}

	err := h.returnService.CreateManualReturn(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Retur manual berhasil dicatat."})
}

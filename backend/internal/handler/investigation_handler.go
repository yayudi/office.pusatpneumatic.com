package handler

import (
	"net/http"
	"strconv"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type InvestigationHandler struct {
	investigationService service.InvestigationService
}

func NewInvestigationHandler(investigationService service.InvestigationService) *InvestigationHandler {
	return &InvestigationHandler{investigationService: investigationService}
}

func (h *InvestigationHandler) GetDuplicateTransactions(c *gin.Context) {
	var req dto.GetDuplicateTransactionsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Parameter tidak valid"})
		return
	}

	// Gin's DefaultQuery handles simple cases, but if we used struct binding with default tags, it might work too.
	if req.Page == 0 {
		req.Page = 1
	}
	if req.Limit == 0 {
		req.Limit = 10
	}

	result, err := h.investigationService.GetDuplicateTransactions(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	resMap := result.(map[string]interface{})
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resMap["data"],
		"meta":    resMap["meta"],
	})
}

func (h *InvestigationHandler) RevertTransaction(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ID tidak valid"})
		return
	}

	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna"})
		return
	}

	err = h.investigationService.RevertTransaction(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Transaksi berhasil di-revert dan stok dikembalikan."})
}

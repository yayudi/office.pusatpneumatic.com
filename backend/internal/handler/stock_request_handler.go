package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type StockRequestHandler struct {
	stockRequestService service.StockRequestService
}

func NewStockRequestHandler(stockRequestService service.StockRequestService) *StockRequestHandler {
	return &StockRequestHandler{stockRequestService: stockRequestService}
}

func (h *StockRequestHandler) Create(c *gin.Context) {
	var req dto.CreateStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "Format input tidak valid",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success":    false,
			"message":    "Tidak ada sesi pengguna",
			"error_code": "UNAUTHORIZED",
		})
		return
	}

	request, err := h.stockRequestService.CreateStockRequest(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    err.Error(),
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Dokumen permintaan stok berhasil dibuat",
		"data":    request,
	})
}

func (h *StockRequestHandler) GetAll(c *gin.Context) {
	requests, err := h.stockRequestService.GetAllStockRequests(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    err.Error(),
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Berhasil mengambil data permintaan stok",
		"data":    requests,
	})
}

func (h *StockRequestHandler) Approve(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ID tidak valid"})
		return
	}

	userID := getUserID(c)
	roleID := c.GetInt("role_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	err = h.stockRequestService.ApproveStockRequest(c.Request.Context(), id, userID, roleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Permintaan stok berhasil disetujui."})
}

func (h *StockRequestHandler) Reject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ID tidak valid"})
		return
	}

	userID := getUserID(c)
	roleID := c.GetInt("role_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	err = h.stockRequestService.RejectStockRequest(c.Request.Context(), id, userID, roleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Permintaan stok telah ditolak."})
}

func (h *StockRequestHandler) Dispatch(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ID tidak valid"})
		return
	}

	userID := getUserID(c)
	roleID := c.GetInt("role_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	err = h.stockRequestService.DispatchStockRequest(c.Request.Context(), id, userID, roleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Barang berhasil dikirim dan stok asal telah dipotong."})
}

func (h *StockRequestHandler) Complete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ID tidak valid"})
		return
	}

	var req dto.CompleteStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}

	userID := getUserID(c)
	roleID := c.GetInt("role_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	err = h.stockRequestService.CompleteStockRequest(c.Request.Context(), id, req, userID, roleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Permintaan stok selesai dan stok telah ditransfer."})
}

func (h *StockRequestHandler) BulkAction(c *gin.Context) {
	var req dto.BulkActionStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}

	userID := getUserID(c)
	roleID := c.GetInt("role_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	res, err := h.stockRequestService.BulkActionStockRequest(c.Request.Context(), req, userID, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Memproses %d permintaan.", len(req.RequestIds)),
		"data":    res,
	})
}

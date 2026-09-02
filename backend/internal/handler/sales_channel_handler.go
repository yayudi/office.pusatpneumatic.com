package handler

import (
	"net/http"
	"strconv"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type SalesChannelHandler struct {
	salesChannelService service.SalesChannelService
}

func NewSalesChannelHandler(salesChannelService service.SalesChannelService) *SalesChannelHandler {
	return &SalesChannelHandler{salesChannelService: salesChannelService}
}

func (h *SalesChannelHandler) GetAllChannels(c *gin.Context) {
	activeOnly := c.Query("activeOnly") == "true"
	data, err := h.salesChannelService.GetAllChannels(c.Request.Context(), activeOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data sales channels",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func (h *SalesChannelHandler) GetChannelByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	data, err := h.salesChannelService.GetChannelByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Sales channel tidak ditemukan",
			"error_code": "NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func (h *SalesChannelHandler) CreateChannel(c *gin.Context) {
	var req dto.CreateSalesChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	userID := c.GetInt("userID")
	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()

	id, err := h.salesChannelService.CreateChannel(c.Request.Context(), req, userID, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menambahkan sales channel",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Saluran penjualan berhasil ditambahkan.",
		"data":    gin.H{"id": id},
	})
}

func (h *SalesChannelHandler) UpdateChannel(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.UpdateSalesChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	userID := c.GetInt("userID")
	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()

	err := h.salesChannelService.UpdateChannel(c.Request.Context(), id, req, userID, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memperbarui sales channel",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Saluran penjualan berhasil diperbarui.",
	})
}

func (h *SalesChannelHandler) DeleteChannel(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("userID")
	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()

	err := h.salesChannelService.DeleteChannel(c.Request.Context(), id, userID, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus sales channel",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Saluran penjualan berhasil dihapus.",
	})
}

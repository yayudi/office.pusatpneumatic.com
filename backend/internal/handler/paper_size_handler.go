package handler

import (
	"log"
	"net/http"
	"strconv"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type PaperSizeHandler struct {
	paperSizeService service.PaperSizeService
}

func NewPaperSizeHandler(paperSizeService service.PaperSizeService) *PaperSizeHandler {
	return &PaperSizeHandler{paperSizeService: paperSizeService}
}

func (h *PaperSizeHandler) GetAllPaperSizes(c *gin.Context) {
	data, err := h.paperSizeService.GetAllPaperSizes(c.Request.Context())
	if err != nil {
		log.Printf("[ERROR] GetAllPaperSizes: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data paper sizes",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func (h *PaperSizeHandler) GetPaperSizeByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	data, err := h.paperSizeService.GetPaperSizeByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Paper size tidak ditemukan",
			"error_code": "NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func (h *PaperSizeHandler) CreatePaperSize(c *gin.Context) {
	var req dto.CreatePaperSizeRequest
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

	id, err := h.paperSizeService.CreatePaperSize(c.Request.Context(), req, userID, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menambahkan paper size",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Paper size berhasil ditambahkan.",
		"data":    gin.H{"id": id},
	})
}

func (h *PaperSizeHandler) UpdatePaperSize(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.UpdatePaperSizeRequest
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

	err := h.paperSizeService.UpdatePaperSize(c.Request.Context(), id, req, userID, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memperbarui paper size",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Paper size berhasil diperbarui.",
	})
}

func (h *PaperSizeHandler) DeletePaperSize(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("userID")
	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()

	err := h.paperSizeService.DeletePaperSize(c.Request.Context(), id, userID, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus paper size",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Paper size berhasil dihapus.",
	})
}

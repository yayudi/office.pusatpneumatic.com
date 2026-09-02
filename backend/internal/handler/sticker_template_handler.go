package handler

import (
	"net/http"
	"strconv"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type StickerTemplateHandler struct {
	stickerTemplateService service.StickerTemplateService
}

func NewStickerTemplateHandler(stickerTemplateService service.StickerTemplateService) *StickerTemplateHandler {
	return &StickerTemplateHandler{stickerTemplateService: stickerTemplateService}
}

func (h *StickerTemplateHandler) GetAllStickerTemplates(c *gin.Context) {
	data, err := h.stickerTemplateService.GetAllStickerTemplates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data sticker templates",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func (h *StickerTemplateHandler) GetStickerTemplateByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	data, err := h.stickerTemplateService.GetStickerTemplateByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Sticker template tidak ditemukan",
			"error_code": "NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func (h *StickerTemplateHandler) CreateStickerTemplate(c *gin.Context) {
	var req dto.CreateStickerTemplateRequest
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

	id, err := h.stickerTemplateService.CreateStickerTemplate(c.Request.Context(), req, userID, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menambahkan sticker template",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Sticker template berhasil ditambahkan.",
		"data":    gin.H{"id": id},
	})
}

func (h *StickerTemplateHandler) UpdateStickerTemplate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.UpdateStickerTemplateRequest
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

	err := h.stickerTemplateService.UpdateStickerTemplate(c.Request.Context(), id, req, userID, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memperbarui sticker template",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Sticker template berhasil diperbarui.",
	})
}

func (h *StickerTemplateHandler) DeleteStickerTemplate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("userID")
	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()

	err := h.stickerTemplateService.DeleteStickerTemplate(c.Request.Context(), id, userID, ip, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal menghapus sticker template",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Sticker template berhasil dihapus.",
	})
}

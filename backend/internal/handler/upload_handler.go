package handler

import (
	"net/http"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type UploadHandler struct {
	storageService service.StorageService
}

func NewUploadHandler(storageService service.StorageService) *UploadHandler {
	return &UploadHandler{storageService: storageService}
}

func (h *UploadHandler) GetPresignedUrl(c *gin.Context) {
	var req dto.SinglePresignedUrlRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    err.Error(),
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	url, key, publicUrl, err := h.storageService.GeneratePresignedUploadUrl(c.Request.Context(), req.FileName, req.MimeType, req.Folder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Gagal men-generate URL upload.",
			"error_code": "STORAGE_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Presigned URL berhasil dibuat",
		"data": gin.H{
			"url":       url,
			"key":       key,
			"publicUrl": publicUrl,
		},
	})
}

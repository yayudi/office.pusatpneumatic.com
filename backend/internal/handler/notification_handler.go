package handler

import (
	"net/http"
	"strconv"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// NotificationHandler handles notification HTTP endpoints.
type NotificationHandler struct {
	notificationService service.NotificationService
}

// NewNotificationHandler creates a new NotificationHandler.
func NewNotificationHandler(notificationService service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notificationService: notificationService}
}

// GetRecentPending handles GET /notifications/recent
func (h *NotificationHandler) GetRecentPending(c *gin.Context) {
	userID := c.GetInt("userID")
	limit := 5
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	data, err := h.notificationService.FetchRecentPending(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Gagal mengambil notifikasi terbaru",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Recent pending notifications fetched",
		"data":    data,
	})
}

// GetAll handles GET /notifications
func (h *NotificationHandler) GetAll(c *gin.Context) {
	userID := c.GetInt("userID")
	filterType := c.DefaultQuery("type", "ALL")

	data, err := h.notificationService.FetchAll(c.Request.Context(), userID, filterType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Gagal mengambil notifikasi",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Notifications fetched",
		"data":    data,
	})
}

// MarkAsDone handles PUT /notifications/:id/done
func (h *NotificationHandler) MarkAsDone(c *gin.Context) {
	userID := c.GetInt("userID")
	notificationIDStr := c.Param("id")

	if notificationIDStr == "all" {
		err := h.notificationService.MarkAllNotificationsAsDone(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success":    false,
				"message":    "Gagal menandai semua notifikasi sebagai selesai",
				"error_code": "INTERNAL_SERVER_ERROR",
			})
			return
		}
	} else {
		notificationID, err := strconv.Atoi(notificationIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success":    false,
				"message":    "ID notifikasi tidak valid",
				"error_code": "VALIDATION_ERROR",
			})
			return
		}
		err = h.notificationService.MarkNotificationAsDone(c.Request.Context(), notificationID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success":    false,
				"message":    "Gagal menandai notifikasi sebagai selesai",
				"error_code": "INTERNAL_SERVER_ERROR",
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Marked as done",
	})
}

// GetPreferences handles GET /notifications/preferences
func (h *NotificationHandler) GetPreferences(c *gin.Context) {
	userID := c.GetInt("userID")

	data, err := h.notificationService.FetchPreferences(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Gagal mengambil preferensi notifikasi",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Preferences fetched",
		"data":    data,
	})
}

// UpdatePreferences handles PUT /notifications/preferences
func (h *NotificationHandler) UpdatePreferences(c *gin.Context) {
	userID := c.GetInt("userID")
	var req dto.UpdatePreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    err.Error(),
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	err := h.notificationService.UpdatePreferences(c.Request.Context(), userID, req.Preferences)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Gagal memperbarui preferensi notifikasi",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Preferences updated successfully",
	})
}

// ClaimNotification handles PUT /notifications/:id/claim
func (h *NotificationHandler) ClaimNotification(c *gin.Context) {
	userID := c.GetInt("userID")
	notificationID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "ID notifikasi tidak valid",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	success, err := h.notificationService.ClaimNotification(c.Request.Context(), notificationID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Gagal mengambil tugas",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	if success {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Tugas berhasil diambil",
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Tugas sudah diambil oleh orang lain atau sudah selesai",
		})
	}
}

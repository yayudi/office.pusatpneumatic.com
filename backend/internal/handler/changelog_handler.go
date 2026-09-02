package handler

import (
	"net/http"

	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type ChangelogHandler struct {
	changelogService service.ChangelogService
}

func NewChangelogHandler(changelogService service.ChangelogService) *ChangelogHandler {
	return &ChangelogHandler{changelogService: changelogService}
}

func (h *ChangelogHandler) GetChangelogs(c *gin.Context) {
	data, err := h.changelogService.GetChangelogs(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data changelog",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Berhasil mengambil data changelog",
		"data":    data,
	})
}

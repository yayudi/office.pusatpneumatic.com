package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type PackageHandler struct {
	jobService service.JobService
}

func NewPackageHandler(jobService service.JobService) *PackageHandler {
	return &PackageHandler{jobService: jobService}
}

func (h *PackageHandler) ExportPackages(c *gin.Context) {
	format := c.DefaultQuery("format", "xlsx")
	search := c.Query("search")
	searchBy := c.Query("searchBy")
	status := c.Query("status")

	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna"})
		return
	}

	filtersMap := map[string]interface{}{
		"exportType": "EXPORT_PACKAGES",
		"format":     format,
		"search":     search,
		"searchBy":   searchBy,
		"status":     status,
	}

	filtersBytes, _ := json.Marshal(filtersMap)
	filtersStr := string(filtersBytes)

	req := dto.CreateExportJobRequest{
		UserID:  userID,
		JobType: "EXPORT_PACKAGES",
		Filters: &filtersStr,
	}

	jobID, err := h.jobService.CreateExportJob(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Export job created successfully",
		"data": map[string]interface{}{
			"jobId": jobID,
		},
	})
}

func (h *PackageHandler) ImportPackagesBatch(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "File tidak ditemukan"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".xlsx" && ext != ".xls" && ext != ".csv" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format file tidak didukung"})
		return
	}

	filename := fmt.Sprintf("import_%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join("uploads", "imports", filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan file"})
		return
	}

	notes := "Batch Package Update"
	req := dto.CreateImportJobRequest{
		UserID:           userID,
		JobType:          "IMPORT_PACKAGES",
		OriginalFilename: file.Filename,
		FilePath:         savePath,
		Notes:            &notes,
	}

	jobID, err := h.jobService.CreateImportJob(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Import job created successfully",
		"data": map[string]interface{}{
			"jobId": jobID,
		},
	})
}

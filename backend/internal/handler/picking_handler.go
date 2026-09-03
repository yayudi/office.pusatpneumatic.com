package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/dps-wmhris/backend/internal/config"
	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type PickingHandler struct {
	jobService     service.JobService
	pickingService service.PickingService
}

func NewPickingHandler(jobService service.JobService, pickingService service.PickingService) *PickingHandler {
	return &PickingHandler{
		jobService:     jobService,
		pickingService: pickingService,
	}
}

func (h *PickingHandler) UploadAndValidate(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Failed to parse form", "error_code": "VALIDATION_ERROR"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Tidak ada file yang diunggah.", "error_code": "VALIDATION_ERROR"})
		return
	}

	userID := getUserID(c)
	source := c.PostForm("source")
	if source == "" {
		source = "Tokopedia"
	}

	isDryRun := c.PostForm("dryRun") == "true"
	locationPurpose := c.PostForm("purpose")
	if locationPurpose == "" {
		locationPurpose = "DISPLAY"
	}

	shopNamesStr := c.PostForm("shopNames")
	var shopNames []string
	if shopNamesStr != "" {
		_ = json.Unmarshal([]byte(shopNamesStr), &shopNames)
	}

	baseJobType := "IMPORT_SALES_" + strings.ToUpper(source)
	jobType := baseJobType
	if isDryRun {
		jobType += "_DRY_RUN"
	}

	modeText := "Import"
	if isDryRun {
		modeText = "Simulasi"
	}
	defaultNote := modeText + " " + source + " Sales"
	userNotes := c.PostForm("notes")

	uploadDir := filepath.Join(config.AppConfig.StoragePath, "uploads", "picking") + string(filepath.Separator)
	os.MkdirAll(uploadDir, os.ModePerm)
	var createdJobs []int

	for i, file := range files {
		shopName := ""
		if i < len(shopNames) {
			shopName = shopNames[i]
		}

		note := defaultNote
		if userNotes != "" {
			note += " | " + userNotes
		}

		filepath := uploadDir + file.Filename
		if err := c.SaveUploadedFile(file, filepath); err != nil {
			continue // Skip failed saves
		}

		// Prepare options JSON string
		optionsMap := map[string]string{
			"purpose":  locationPurpose,
			"shopName": shopName,
		}
		optionsBytes, _ := json.Marshal(optionsMap)
		optionsStr := string(optionsBytes)

		req := dto.CreateImportJobRequest{
			UserID:           userID,
			JobType:          jobType,
			OriginalFilename: file.Filename,
			FilePath:         filepath,
			Notes:            &note,
			Options:          &optionsStr,
		}

		jobID, err := h.jobService.CreateImportJob(c.Request.Context(), req)
		if err == nil {
			createdJobs = append(createdJobs, jobID)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "File masuk antrian.",
		"data": gin.H{
			"jobIds": createdJobs,
		},
	})
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

func (h *PickingHandler) GetPendingItems(c *gin.Context) {
	items, err := h.pickingService.GetPendingItems(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

func (h *PickingHandler) GetHistoryItems(c *gin.Context) {
	// default limit 1000
	items, err := h.pickingService.GetHistoryItems(c.Request.Context(), 1000)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

func (h *PickingHandler) GetPickingDetail(c *gin.Context) {
	// Parse ID from param
	idStr := c.Param("id")
	var id int
	fmt.Sscanf(idStr, "%d", &id)

	items, err := h.pickingService.GetPickingDetail(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

func (h *PickingHandler) CompleteItems(c *gin.Context) {
	var req dto.CompletePickingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format data tidak valid.", "error_code": "VALIDATION_ERROR"})
		return
	}

	userID := getUserID(c)

	msg, validationErrs, err := h.pickingService.CompletePickingItems(c.Request.Context(), req, userID)
	if err != nil {
		if len(validationErrs) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success":    false,
				"message":    "Sebagian pesanan gagal diproses karena masalah ketersediaan stok atau status.",
				"error_code": "PROCESS_ERROR",
				"errors":     validationErrs,
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "PROCESS_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": msg})
}

func (h *PickingHandler) VoidPickingList(c *gin.Context) {
	idStr := c.Param("id")
	var id int
	fmt.Sscanf(idStr, "%d", &id)

	userID := getUserID(c)

	err := h.pickingService.VoidPickingList(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "PROCESS_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Picking List dibatalkan."})
}

func (h *PickingHandler) RetryBackorders(c *gin.Context) {
	idStr := c.Param("id")
	var id int
	fmt.Sscanf(idStr, "%d", &id)

	msg, err := h.pickingService.RetryBackorders(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "PROCESS_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": msg})
}

func (h *PickingHandler) RetryBackordersBatch(c *gin.Context) {
	var req dto.RetryBackordersBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[RetryBackordersBatch] validation error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format data tidak valid.", "error_code": "VALIDATION_ERROR"})
		return
	}

	msg, err := h.pickingService.RetryBackordersBatch(c.Request.Context(), req)
	if err != nil {
		log.Printf("[RetryBackordersBatch] process error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "PROCESS_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": msg})
}

// UploadSalesReport is a legacy fallback
func (h *PickingHandler) UploadSalesReport(c *gin.Context) {
	c.JSON(http.StatusGone, gin.H{
		"success":    false,
		"message":    "API Deprecated. Use /upload-and-validate",
		"error_code": "DEPRECATED",
	})
}

package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/dps-wmhris/backend/internal/database"
	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/repository"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/xuri/excelize/v2"
)

type MediaHandler struct {
	db             *sqlx.DB
	mediaService   service.MediaService
	storageService service.StorageService
	jobService     service.JobService
}

func NewMediaHandler(db *sqlx.DB, mediaService service.MediaService, storageService service.StorageService, jobService service.JobService) *MediaHandler {
	return &MediaHandler{db: db, mediaService: mediaService, storageService: storageService, jobService: jobService}
}

func (h *MediaHandler) ListMedia(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var filter repository.MediaFilter
	if s := c.Query("search"); s != "" {
		filter.Search = strings.TrimSpace(s)
	}
	if ls := c.Query("linkStatus"); ls != "" {
		var statusMap map[string][]string
		if err := json.Unmarshal([]byte(ls), &statusMap); err == nil {
			filter.LinkStatus = statusMap
		} else {
			if ls == "linked" || ls == "orphaned" {
				filter.RawStatus = ls
			}
		}
	}

	assets, total, err := h.mediaService.GetMediaAssets(c.Request.Context(), limit, offset, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Gagal mengambil media",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	totalPages := total / limit
	if total%limit != 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    assets,
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

func (h *MediaHandler) GetMediaByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	asset, err := h.mediaService.GetMediaDetailsWithProducts(c.Request.Context(), id)
	if err != nil || asset == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success":    false,
			"message":    "Aset tidak ditemukan",
			"error_code": "NOT_FOUND",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    asset,
	})
}

func (h *MediaHandler) GetMediaStatus(c *gin.Context) {
	idsStr := c.Query("ids")
	if idsStr == "" {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []dto.MediaAssetResponse{}})
		return
	}

	parts := strings.Split(idsStr, ",")
	var ids []int
	for _, p := range parts {
		if id, err := strconv.Atoi(strings.TrimSpace(p)); err == nil {
			ids = append(ids, id)
		}
	}

	if len(ids) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []dto.MediaAssetResponse{}})
		return
	}

	assets, err := h.mediaService.GetMediaAssetsByIDs(c.Request.Context(), ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": assets})
}

func (h *MediaHandler) GetPresignedUrls(c *gin.Context) {
	var req dto.PresignedUrlRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "List file tidak valid"})
		return
	}
	if len(req.Files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "List file tidak valid"})
		return
	}

	var urls []map[string]string
	for _, f := range req.Files {
		mainUrl, mainKey, _, _ := h.storageService.GeneratePresignedUploadUrl(c.Request.Context(), f.Name, f.Type, "main")
		thumbUrl, thumbKey, _, _ := h.storageService.GeneratePresignedUploadUrl(c.Request.Context(), "thumb_"+f.Name, f.Type, "thumb")

		// Just append, if err we can ignore or fail (Node.js ignores errors in loop generally unless it throws)
		urls = append(urls, map[string]string{
			"originalName": f.Name,
			"main":         mainUrl,
			"thumb":        thumbUrl,
			"mainKey":      mainKey, // Optional: helpful for client
			"thumbKey":     thumbKey, // Optional: helpful for client
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": urls})
}

func (h *MediaHandler) ConfirmUpload(c *gin.Context) {
	var req dto.ConfirmUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Metadata aset tidak valid"})
		return
	}
	if len(req.Assets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Metadata aset tidak valid"})
		return
	}

	userID := c.GetInt("userID")
	var uploadedAssets []map[string]interface{}

	err := database.WithTransaction(h.db, c.Request.Context(), func(tx *sqlx.Tx) error {
		for _, asset := range req.Assets {
			mediaID, err := h.mediaService.SaveMediaMetadata(c.Request.Context(), tx, asset, userID)
			if err != nil {
				return err // Will be caught below, checks for DuplicateError
			}

			// We need product linking logic here, for now skipped or we inject ProductRepo
			// In Go, since we migrate modules independently, we can do raw query here
			if req.Products != nil {
				var prodIDs []int
				switch v := req.Products.(type) {
				case float64:
					prodIDs = append(prodIDs, int(v))
				case []interface{}:
					for _, item := range v {
						if f, ok := item.(float64); ok {
							prodIDs = append(prodIDs, int(f))
						}
					}
				}
				for _, pID := range prodIDs {
					_, txErr := tx.ExecContext(c.Request.Context(), "INSERT IGNORE INTO product_images (product_id, media_id, is_primary) VALUES (?, ?, 0)", pID, mediaID)
					if txErr != nil {
						return txErr
					}
				}
			}

			uploadedAssets = append(uploadedAssets, map[string]interface{}{
				"id":           mediaID,
				"originalName": asset.Title,
				"status":       "COMPLETED",
			})
		}
		return nil
	})

	if err != nil {
		if dupErr, ok := err.(service.DuplicateError); ok {
			c.JSON(http.StatusConflict, gin.H{
				"success":    false,
				"message":    "File sudah pernah diunggah sebelumnya.",
				"error_code": "DUPLICATE_MEDIA",
				"duplicate":  dupErr.DuplicateOf,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    err.Error(),
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Media berhasil disimpan",
		"data":    uploadedAssets,
	})
}

func (h *MediaHandler) DeleteMedia(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	err := database.WithTransaction(h.db, c.Request.Context(), func(tx *sqlx.Tx) error {
		mainPath, thumbPath, err := h.mediaService.DeleteMediaAsset(c.Request.Context(), tx, id)
		if err != nil {
			return err
		}
		_ = h.mediaService.InsertTrashQueue(c.Request.Context(), tx, mainPath)
		_ = h.mediaService.InsertTrashQueue(c.Request.Context(), tx, thumbPath)
		return nil
	})

	if err != nil {
		if strings.Contains(err.Error(), "foreign key constraint fails") || strings.Contains(err.Error(), "a foreign key constraint fails") || strings.Contains(err.Error(), "ROW_IS_REFERENCED") {
			c.JSON(http.StatusConflict, gin.H{
				"success":    false,
				"message":    "Tidak bisa dihapus karena sedang dipakai oleh produk",
				"error_code": "CONFLICT",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Gagal menghapus media",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Media berhasil dihapus"})
}

func (h *MediaHandler) UpdateMediaTags(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.UpdateMediaTagsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	err := database.WithTransaction(h.db, c.Request.Context(), func(tx *sqlx.Tx) error {
		return h.mediaService.UpdateMediaTags(c.Request.Context(), tx, id, req.Tags)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal update tags"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Tags berhasil diperbarui"})
}

func (h *MediaHandler) UpdateMediaTitle(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req dto.UpdateMediaTitleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	err := database.WithTransaction(h.db, c.Request.Context(), func(tx *sqlx.Tx) error {
		return h.mediaService.UpdateMediaTitle(c.Request.Context(), tx, id, req.Title)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal update title"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Judul berhasil diperbarui"})
}

// DownloadBulkLinkTemplate generates and returns the Excel template for bulk linking media.
func (h *MediaHandler) DownloadBulkLinkTemplate(c *gin.Context) {
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			// logging is omitted for brevity, normally we'd log err
		}
	}()

	sheetName := "Template Tautkan Media"
	f.SetSheetName("Sheet1", sheetName)

	// Set headers
	f.SetCellValue(sheetName, "A1", "SKU")
	f.SetCellValue(sheetName, "B1", "Image_URL")

	// Set column widths
	f.SetColWidth(sheetName, "A", "A", 20)
	f.SetColWidth(sheetName, "B", "B", 50)

	// Set header style
	headerStyle, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{
			Type:    "pattern",
			Pattern: 1,
			Color:   []string{"#DDDDDD"},
		},
	})
	if err == nil {
		f.SetRowStyle(sheetName, 1, 1, headerStyle)
	}

	// Add sample data
	f.SetCellValue(sheetName, "A2", "PP000R081")
	f.SetCellValue(sheetName, "B2", "https://api.dpvindonesia.com/uploads/main/main-1783397524366-325551216.webp")

	f.SetCellValue(sheetName, "A3", "PP000453P")
	f.SetCellValue(sheetName, "B3", "https://api.dpvindonesia.com/uploads/main/main-dpv_indonesia_logo-white_lettermark_sm.png")

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=Template_Tautkan_Media.xlsx")

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal generate template"})
	}
}

func (h *MediaHandler) BulkLinkExcel(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"success": false, "message": "Fitur unggah Excel akan dipindah di Worker Golang pada fase selanjutnya."})
}

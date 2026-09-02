package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	productService service.ProductService
	jobService     service.JobService
}

func NewProductHandler(productService service.ProductService, jobService service.JobService) *ProductHandler {
	return &ProductHandler{
		productService: productService,
		jobService:     jobService,
	}
}

// helper untuk mengekstrak user_id dari gin context (JWT map claims parses numbers as float64)
func getUserID(c *gin.Context) int {
	val, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	switch v := val.(type) {
	case float64:
		return int(v)
	case int:
		return v
	default:
		return 0
	}
}

func (h *ProductHandler) Create(c *gin.Context) {
	var req dto.CreateProductRequest
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
			"message":    "Tidak ada sesi pengguna yang valid",
			"error_code": "UNAUTHORIZED",
		})
		return
	}

	product, err := h.productService.CreateProduct(c.Request.Context(), userID, req)
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
		"message": "Produk berhasil ditambahkan",
		"data":    product,
	})
}

func (h *ProductHandler) SearchProducts(c *gin.Context) {
	q := c.Query("q")
	locationId := c.Query("locationId")
	inStockOnly := c.Query("inStockOnly") == "true"
	
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	results, err := h.productService.SearchProducts(c.Request.Context(), q, locationId, inStockOnly, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_SERVER_ERROR"})
		return
	}
	c.JSON(http.StatusOK, results)
}

func (h *ProductHandler) GetAdminList(c *gin.Context) {
	results, err := h.productService.GetAllActiveProducts(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_SERVER_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
}

func (h *ProductHandler) GetProducts(c *gin.Context) {
	var req dto.ProductFilterRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid query parameters"})
		return
	}

	results, total, err := h.productService.GetProductsWithFilters(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_SERVER_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  results,
		"total": total,
	})
}

func (h *ProductHandler) GetProductById(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID"})
		return
	}

	product, err := h.productService.GetProductDetailWithStock(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Product not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": product})
}

func (h *ProductHandler) GetProductStockDetails(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID"})
		return
	}

	results, err := h.productService.GetProductStockDetails(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
}

func (h *ProductHandler) GetProductHistory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID"})
		return
	}

	results, err := h.productService.GetProductHistory(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
}

func (h *ProductHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID"})
		return
	}

	var req dto.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}

	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna yang valid"})
		return
	}

	if err := h.productService.UpdateProduct(c.Request.Context(), userID, id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Produk berhasil diperbarui."})
}

func (h *ProductHandler) GetAll(c *gin.Context) {
	products, err := h.productService.GetAllProducts(c.Request.Context())
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
		"message": "Berhasil mengambil data produk",
		"data":    products,
	})
}

func (h *ProductHandler) ImportBatchProductUpdate(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "File tidak ditemukan.", "error_code": "VALIDATION_ERROR"})
		return
	}

	userID := 1 // Dummy ID for now
	dryRun := c.PostForm("dryRun")
	jobType := "BATCH_EDIT_PRODUCT"
	if dryRun == "true" {
		jobType = "BATCH_EDIT_PRODUCT_DRY_RUN"
	}

	notes := "Mass Price Update via Web Upload"

	uploadDir := "./storage/uploads/"
	filepath := uploadDir + file.Filename

	if err := c.SaveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to save file", "error_code": "INTERNAL_ERROR"})
		return
	}

	req := dto.CreateImportJobRequest{
		UserID:           userID,
		JobType:          jobType,
		OriginalFilename: file.Filename,
		FilePath:         filepath,
		Notes:            &notes,
	}

	jobID, err := h.jobService.CreateImportJob(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "File berhasil diunggah. Proses update berjalan di latar belakang.",
		"jobId":   jobID,
	})
}

func (h *ProductHandler) Delete(c *gin.Context) {
	idParam := c.Param("id")
	productID, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "ID Produk tidak valid",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success":    false,
			"message":    "Tidak ada sesi pengguna yang valid",
			"error_code": "UNAUTHORIZED",
		})
		return
	}

	if err := h.productService.DeleteProduct(c.Request.Context(), userID, productID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    err.Error(),
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Produk berhasil dihapus",
		"data":    nil,
	})
}

// ExportProducts creates an export job for products. Matches GET /api/products/export.
func (h *ProductHandler) ExportProducts(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna yang valid"})
		return
	}

	filters := map[string]interface{}{
		"search":       c.Query("search"),
		"searchBy":     c.DefaultQuery("searchBy", "name"),
		"location":     c.DefaultQuery("location", "all"),
		"status":       c.DefaultQuery("status", "active"),
		"is_package":   c.Query("is_package"),
		"packageOnly":  c.Query("packageOnly"),
		"minusOnly":    c.Query("minusOnly"),
		"building":     c.DefaultQuery("building", "all"),
		"floor":        c.DefaultQuery("floor", "all"),
		"sortBy":       c.DefaultQuery("sortBy", "sku"),
		"sortOrder":    c.DefaultQuery("sortOrder", "ASC"),
		"format":       c.DefaultQuery("format", "xlsx"),
		"includeImages": c.Query("includeImages"),
		"exportType":   "PRODUCT_MASTER",
	}

	columnsRaw := c.Query("columns")
	if columnsRaw != "" {
		var columns []string
		if err := json.Unmarshal([]byte(columnsRaw), &columns); err == nil {
			filters["columns"] = columns
		}
	}

	filterJSON, _ := json.Marshal(filters)
	filterStr := string(filterJSON)

	jobReq := dto.CreateExportJobRequest{
		UserID:  userID,
		JobType: "PRODUCT_MASTER",
		Filters: &filterStr,
	}

	jobID, err := h.jobService.CreateExportJob(c.Request.Context(), jobReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Permintaan ekspor diterima. Silakan cek menu 'Laporan Saya' untuk mengunduh.",
		"jobId":   jobID,
	})
}

// GetProductStockTimeline returns the paginated stock timeline. Matches GET /api/products/:id/stock-timeline.
func (h *ProductHandler) GetProductStockTimeline(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))

	var buildings []string
	buildingParam := c.Query("building")
	if buildingParam != "" {
		buildings = strings.Split(buildingParam, ",")
	}

	result, err := h.productService.GetHistoricalStockTimeline(c.Request.Context(), id, page, limit, buildings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

// LinkMedia links media to a product. Matches POST /api/products/:id/link-media.
func (h *ProductHandler) LinkMedia(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID"})
		return
	}

	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna yang valid"})
		return
	}

	var req dto.LinkMediaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}

	if err := h.productService.LinkMediaToProduct(c.Request.Context(), id, req.MediaIDs, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Media berhasil disematkan."})
}

// SetPrimaryImage sets a specific image as primary. Matches PUT /api/products/:id/images/:imageId/primary.
func (h *ProductHandler) SetPrimaryImage(c *gin.Context) {
	productID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid product ID"})
		return
	}

	imageID, err := strconv.Atoi(c.Param("imageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid image ID"})
		return
	}

	userID := getUserID(c)
	if err := h.productService.SetPrimaryImage(c.Request.Context(), productID, imageID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Gambar utama berhasil diatur."})
}

// DeleteProductImage removes a specific product image. Matches DELETE /api/products/:id/images/:imageId.
func (h *ProductHandler) DeleteProductImage(c *gin.Context) {
	imageID, err := strconv.Atoi(c.Param("imageId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid image ID"})
		return
	}

	userID := getUserID(c)
	if err := h.productService.DeleteProductImage(c.Request.Context(), imageID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Gambar berhasil dihapus."})
}

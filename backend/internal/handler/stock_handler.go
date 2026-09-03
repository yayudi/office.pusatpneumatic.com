package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/dps-wmhris/backend/internal/config"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type StockHandler struct {
	stockService service.StockService
	jobService   service.JobService
}

func NewStockHandler(stockService service.StockService, jobService service.JobService) *StockHandler {
	return &StockHandler{
		stockService: stockService,
		jobService:   jobService,
	}
}

func (h *StockHandler) MoveStock(c *gin.Context) {
	var req dto.MoveStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "Format input tidak valid (pastikan ProductID, Quantity > 0, dan MovementType diisi)",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	userID := getUserID(c) // Menggunakan helper yang sama
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success":    false,
			"message":    "Tidak ada sesi pengguna",
			"error_code": "UNAUTHORIZED",
		})
		return
	}

	err := h.stockService.MoveStock(c.Request.Context(), userID, req)
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
		"message": "Mutasi stok berhasil dieksekusi secara atomik",
		"data":    nil,
	})
}

func (h *StockHandler) ImportBatchInbound(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Tidak ada file yang diunggah.", "error_code": "VALIDATION_ERROR"})
		return
	}

	userID := getUserID(c)
	notes := c.PostForm("notes")
	finalNotes := "Batch Stock Inbound"
	if notes != "" {
		finalNotes += " | " + notes
	}

	uploadDir := filepath.Join(config.AppConfig.StoragePath, "uploads", "stock") + string(filepath.Separator)
	os.MkdirAll(uploadDir, os.ModePerm)
	filepath := uploadDir + file.Filename

	if err := c.SaveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to save file", "error_code": "INTERNAL_ERROR"})
		return
	}

	req := dto.CreateImportJobRequest{
		UserID:           userID,
		JobType:          "IMPORT_STOCK_INBOUND",
		OriginalFilename: file.Filename,
		FilePath:         filepath,
		Notes:            &finalNotes,
	}

	jobID, err := h.jobService.CreateImportJob(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "File inbound masuk antrian.",
		"jobId":   jobID,
	})
}

func (h *StockHandler) GetAllStocks(c *gin.Context) {
	stocks, err := h.stockService.GetAllStocks(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": stocks})
}

func (h *StockHandler) TransferStock(c *gin.Context) {
	var req dto.TransferStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}

	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna"})
		return
	}

	// Membungkus panggilan ke MoveStock
	moveReq := dto.MoveStockRequest{
		ProductID:      req.ProductID,
		Quantity:       req.Quantity,
		MovementType:   "TRANSFER",
		FromLocationID: &req.FromLocationID,
		ToLocationID:   &req.ToLocationID,
		Notes:          req.Notes,
	}

	if err := h.stockService.MoveStock(c.Request.Context(), userID, moveReq); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Transfer stok berhasil."})
}

func (h *StockHandler) AdjustStock(c *gin.Context) {
	var req dto.AdjustStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}

	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Tidak ada sesi pengguna"})
		return
	}

	// Konversi input logic berdasarkan type
	movementType := "ADJUST_PLUS"
	qty := req.Quantity
	var fromLocationID, toLocationID *int

	if req.Type == "ADJUST_MINUS" || req.Type == "OUT" {
		movementType = "ADJUST_MINUS"
		if qty > 0 {
			qty = -qty
		}
	} else if req.Type == "ADJUST_PLUS" || req.Type == "IN" {
		movementType = "ADJUST_PLUS"
		if qty < 0 {
			qty = -qty
		}
	}

	if qty > 0 {
		toLocationID = &req.LocationID
	} else if qty < 0 {
		fromLocationID = &req.LocationID
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Quantity tidak boleh 0"})
		return
	}
	
	// abs the quantity for moveReq because MoveStock expects positive quantity
	absQty := qty
	if absQty < 0 {
		absQty = -absQty
	}

	moveReq := dto.MoveStockRequest{
		ProductID:      req.ProductID,
		Quantity:       absQty,
		MovementType:   movementType,
		FromLocationID: fromLocationID,
		ToLocationID:   toLocationID,
		Notes:          req.Notes,
	}

	if err := h.stockService.MoveStock(c.Request.Context(), userID, moveReq); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Penyesuaian stok berhasil."})
}

func (h *StockHandler) BatchProcess(c *gin.Context) {
	var req dto.BatchProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format request tidak valid.", "error": err.Error()})
		return
	}

	userID := c.GetInt("user_id")
	userRoleID := c.GetInt("role_id")

	err := h.stockService.ProcessBatchMovements(c.Request.Context(), req, userID, userRoleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"success": true, "message": fmt.Sprintf("Batch %s berhasil.", req.Type)})
}

func (h *StockHandler) GetMovementTypes(c *gin.Context) {
	types, err := h.stockService.GetMovementTypes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal mengambil tipe pergerakan stok", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": types})
}

func (h *StockHandler) GetBatchLogs(c *gin.Context) {
	var filter dto.BatchLogFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Filter tidak valid", "error": err.Error()})
		return
	}

	// Set default start/end dates if not provided
	if filter.StartDate == "" || filter.EndDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Tanggal mulai dan selesai harus diisi"})
		return
	}

	logs, total, err := h.stockService.GetBatchLogs(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal mengambil log stok", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true, 
		"data": logs,
		"pagination": gin.H{
			"page": filter.Page,
			"limit": filter.Limit,
			"total": total,
		},
	})
}

func (h *StockHandler) GetStockHistory(c *gin.Context) {
	var filter dto.StockHistoryFilter
	if err := c.ShouldBindUri(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ID produk tidak valid", "error": err.Error()})
		return
	}
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Filter tidak valid", "error": err.Error()})
		return
	}

	result, err := h.stockService.GetStockHistory(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal mengambil riwayat stok", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": result.Data,
		"pagination": result.Pagination,
	})
}

func (h *StockHandler) BatchTransfer(c *gin.Context) {
	var req dto.BatchTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}
	userID := getUserID(c)
	roleID := c.GetInt("role_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	processReq := dto.BatchProcessRequest{
		Type:           "TRANSFER",
		FromLocationID: &req.FromLocationID,
		ToLocationID:   &req.ToLocationID,
		Movements:      req.Movements,
	}

	err := h.stockService.ProcessBatchMovements(c.Request.Context(), processReq, userID, roleID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Batch transfer berhasil."})
}

func (h *StockHandler) ValidateReturn(c *gin.Context) {
	var req dto.ValidateReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}
	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	err := h.stockService.ValidateReturn(c.Request.Context(), req, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": fmt.Sprintf("Item (ID: %d) berhasil divalidasi.", req.PickingListItemID)})
}

func (h *StockHandler) RequestBatchLogExport(c *gin.Context) {
	var req dto.BatchLogExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Format input tidak valid"})
		return
	}
	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	filterMap := map[string]interface{}{
		"startDate":           req.StartDate,
		"endDate":             req.EndDate,
		"productName":         req.ProductName,
		"movementType":        req.MovementType,
		"sourceLocation":      req.SourceLocation,
		"destinationLocation": req.DestinationLocation,
		"notes":               req.Notes,
		"format":              req.Format,
		"exportName":          req.ExportName,
	}
	
	filterJSON, _ := json.Marshal(filterMap)
	filterStr := string(filterJSON)

	jobReq := dto.CreateExportJobRequest{
		UserID:  userID,
		JobType: "BATCH_LOG_EXPORT",
		Filters: &filterStr,
	}

	jobID, err := h.jobService.CreateExportJob(c.Request.Context(), jobReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"success": true,
		"message": "Permintaan ekspor batch log diterima. File sedang diproses.",
		"jobId":   jobID,
	})
}

func (h *StockHandler) GetInboundTemplate(c *gin.Context) {
	f, err := h.stockService.GenerateInboundTemplate(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=Template_Inbound_Stok.xlsx")
	f.Write(c.Writer)
}

func (h *StockHandler) DownloadAdjustmentTemplate(c *gin.Context) {
	f, err := h.stockService.GenerateAdjustmentTemplate(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=Template_Adjustment_Stok.xlsx")
	f.Write(c.Writer)
}

func (h *StockHandler) RequestAdjustmentUpload(c *gin.Context) {
	file, err := c.FormFile("adjustmentFile")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Tidak ada file yang diunggah."})
		return
	}
	userID := getUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}

	isDryRun := c.PostForm("dryRun") == "true"
	jobType := "ADJUST_STOCK"
	msg := "File adjustment masuk antrian."
	notes := "Stock Opname"
	if isDryRun {
		jobType = "ADJUST_STOCK_DRY_RUN"
		msg = "Simulasi validasi stok berjalan..."
		notes = "Simulasi Stock Opname"
	}
	if userNotes := c.PostForm("notes"); userNotes != "" {
		notes = userNotes
	}

	uploadDir := filepath.Join(config.AppConfig.StoragePath, "uploads", "stock") + string(filepath.Separator)
	os.MkdirAll(uploadDir, os.ModePerm)
	filepath := uploadDir + file.Filename
	if err := c.SaveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Gagal menyimpan file"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": msg,
		"jobId":   jobID,
	})
}

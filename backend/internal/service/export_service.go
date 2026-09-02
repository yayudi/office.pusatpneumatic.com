package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/repository"
	"github.com/xuri/excelize/v2"
)

type ExportService interface {
	ProcessExportStockMovement(ctx context.Context, jobID int, filtersJSON string) error
	ProcessExportStockTimeline(ctx context.Context, jobID int, filtersJSON string) error
	// TODO: Add other exports like Package Analysis, Inventory Value, etc. if needed later
}

type exportServiceImpl struct {
	jobRepo          repository.JobRepository
	statisticService StatisticService
	storageService   StorageService
}

func NewExportService(jobRepo repository.JobRepository, statisticService StatisticService, storageService StorageService) ExportService {
	return &exportServiceImpl{
		jobRepo:          jobRepo,
		statisticService: statisticService,
		storageService:   storageService,
	}
}

func (s *exportServiceImpl) ProcessExportStockMovement(ctx context.Context, jobID int, filtersJSON string) error {
	s.jobRepo.UpdateExportJobStatus(ctx, jobID, "PROCESSING", nil, nil)

	var filters map[string]interface{}
	_ = json.Unmarshal([]byte(filtersJSON), &filters)

	req := dto.StatisticFilterRequest{}
	if v, ok := filters["startDate"].(string); ok {
		req.StartDate = v
	}
	if v, ok := filters["endDate"].(string); ok {
		req.EndDate = v
	}
	if v, ok := filters["searchQuery"].(string); ok {
		req.SearchQuery = v
	}

	data, err := s.statisticService.GetStockMovementStatistics(ctx, req)
	if err != nil {
		errMsg := err.Error()
		s.jobRepo.UpdateExportJobStatus(ctx, jobID, "FAILED", nil, &errMsg)
		return err
	}

	// Buat file Excel
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {}
	}()

	sheetName := "Stock Movements"
	f.SetSheetName("Sheet1", sheetName)

	// Set Headers
	headers := []string{"SKU", "Nama Produk", "Stok Saat Ini", "Total Terjual", "Total Masuk", "Rata-rata Terjual Harian", "Estimasi Hari Habis", "Status"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, h)
	}

	// Set Data
	for r, row := range data.Summary {
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", r+2), row.SKU)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", r+2), row.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", r+2), row.CurrentStock)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", r+2), row.TotalSold)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", r+2), row.TotalInbound)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", r+2), row.AvgDailySales)

		var estimasi string
		if row.DaysOfInventory != nil {
			if *row.DaysOfInventory == -1 {
				estimasi = "N/A"
			} else {
				estimasi = fmt.Sprintf("%.1f", *row.DaysOfInventory)
			}
		}
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", r+2), estimasi)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", r+2), row.Status)
	}

	// Tulis ke buffer
	var b bytes.Buffer
	if err := f.Write(&b); err != nil {
		errMsg := err.Error()
		s.jobRepo.UpdateExportJobStatus(ctx, jobID, "FAILED", nil, &errMsg)
		return err
	}

	// Upload ke R2
	fileName := fmt.Sprintf("stock_movement_export_%s.xlsx", req.StartDate)
	url, err := s.storageService.UploadFile(ctx, b.Bytes(), fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "exports")
	if err != nil {
		errMsg := err.Error()
		s.jobRepo.UpdateExportJobStatus(ctx, jobID, "FAILED", nil, &errMsg)
		return err
	}

	// Update DB
	s.jobRepo.UpdateExportJobStatus(ctx, jobID, "COMPLETED", &url, nil)
	return nil
}

func (s *exportServiceImpl) ProcessExportStockTimeline(ctx context.Context, jobID int, filtersJSON string) error {
	s.jobRepo.UpdateExportJobStatus(ctx, jobID, "PROCESSING", nil, nil)

	var filters map[string]interface{}
	_ = json.Unmarshal([]byte(filtersJSON), &filters)

	req := dto.StatisticFilterRequest{}
	if v, ok := filters["searchQuery"].(string); ok {
		req.SearchQuery = v
	}
	
	// Untuk timeline asumsikan rentang diambil secara dinamis atau hardcode,
	// karena getStockTimeline tidak selalu minta startDate.
	req.StartDate = "2020-01-01" 
	req.EndDate = "2030-01-01"

	data, err := s.statisticService.GetStockTimelineStatistics(ctx, req)
	if err != nil {
		errMsg := err.Error()
		s.jobRepo.UpdateExportJobStatus(ctx, jobID, "FAILED", nil, &errMsg)
		return err
	}

	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Stock Timeline"
	f.SetSheetName("Sheet1", sheetName)

	headers := []string{"Tanggal", "Total Masuk", "Total Keluar", "Net Perubahan"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, h)
	}

	for r, row := range data {
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", r+2), row.Date)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", r+2), row.TotalIn)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", r+2), row.TotalOut)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", r+2), row.NetChange)
	}

	var b bytes.Buffer
	if err := f.Write(&b); err != nil {
		errMsg := err.Error()
		s.jobRepo.UpdateExportJobStatus(ctx, jobID, "FAILED", nil, &errMsg)
		return err
	}

	fileName := "stock_timeline_export.xlsx"
	url, err := s.storageService.UploadFile(ctx, b.Bytes(), fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "exports")
	if err != nil {
		errMsg := err.Error()
		s.jobRepo.UpdateExportJobStatus(ctx, jobID, "FAILED", nil, &errMsg)
		return err
	}

	s.jobRepo.UpdateExportJobStatus(ctx, jobID, "COMPLETED", &url, nil)
	return nil
}

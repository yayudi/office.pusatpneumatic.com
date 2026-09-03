package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/repository"
)

type ReportService interface {
	GetReportFilters(ctx context.Context) (dto.ReportFilterResponse, error)
	GetUserExportJobs(ctx context.Context, userID int, baseURL string) ([]dto.UserExportJobResponse, error)
}

type reportServiceImpl struct {
	reportRepo repository.ReportRepository
}

func NewReportService(reportRepo repository.ReportRepository) ReportService {
	return &reportServiceImpl{reportRepo: reportRepo}
}

func (s *reportServiceImpl) GetReportFilters(ctx context.Context) (dto.ReportFilterResponse, error) {
	buildings, err := s.reportRepo.GetDistinctBuildings(ctx)
	if err != nil {
		return dto.ReportFilterResponse{}, err
	}
	
	if buildings == nil {
		buildings = []string{}
	}

	purposes, err := s.reportRepo.GetDistinctPurposes(ctx)
	if err != nil {
		return dto.ReportFilterResponse{}, err
	}
	
	if purposes == nil {
		purposes = []string{}
	}

	relations, err := s.reportRepo.GetBuildingPurposeRelations(ctx)
	if err != nil {
		return dto.ReportFilterResponse{}, err
	}

	buildingsByPurpose := make(map[string][]string)
	for _, row := range relations {
		purpose := row["purpose"].(string)
		building := row["building"].(string)

		if _, exists := buildingsByPurpose[purpose]; !exists {
			buildingsByPurpose[purpose] = []string{}
		}
		buildingsByPurpose[purpose] = append(buildingsByPurpose[purpose], building)
	}

	return dto.ReportFilterResponse{
		AllBuildings:       buildings,
		Purposes:           purposes,
		BuildingsByPurpose: buildingsByPurpose,
	}, nil
}

func (s *reportServiceImpl) GetUserExportJobs(ctx context.Context, userID int, baseURL string) ([]dto.UserExportJobResponse, error) {
	jobs, err := s.reportRepo.GetUserExportJobs(ctx, userID)
	if err != nil {
		return nil, err
	}

	var response []dto.UserExportJobResponse
	for _, job := range jobs {
		exportType := "STOCK_REPORT"
		if job.Filters != nil {
			var parsed map[string]interface{}
			if err := json.Unmarshal([]byte(*job.Filters), &parsed); err == nil {
				if t, ok := parsed["exportType"].(string); ok {
					exportType = t
				}
			}
		}

		var downloadURL *string
		if job.FilePath != nil && *job.FilePath != "" {
			var url string
			if strings.HasPrefix(*job.FilePath, "http://") || strings.HasPrefix(*job.FilePath, "https://") {
				url = *job.FilePath
			} else {
				url = fmt.Sprintf("%s/uploads/exports/stocks/%s", baseURL, *job.FilePath)
			}
			downloadURL = &url
		}

		response = append(response, dto.UserExportJobResponse{
			ID:           job.ID,
			Status:       job.Status,
			FilePath:     job.FilePath,
			ErrorMessage: job.ErrorMessage,
			CreatedAt:    job.CreatedAt,
			Filters:      job.Filters,
			Type:         exportType,
			DownloadURL:  downloadURL,
		})
	}
	
	if response == nil {
		response = []dto.UserExportJobResponse{}
	}

	return response, nil
}

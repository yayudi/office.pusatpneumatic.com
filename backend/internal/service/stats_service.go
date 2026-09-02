package service

import (
	"context"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/repository"
)

type StatsService interface {
	GetKpiSummary(ctx context.Context) (dto.KpiSummaryResponse, error)
}

type statsServiceImpl struct {
	statsRepo repository.StatsRepository
}

func NewStatsService(statsRepo repository.StatsRepository) StatsService {
	return &statsServiceImpl{statsRepo: statsRepo}
}

func (s *statsServiceImpl) GetKpiSummary(ctx context.Context) (dto.KpiSummaryResponse, error) {
	activity, err := s.statsRepo.GetActivityKpi(ctx)
	if err != nil {
		return dto.KpiSummaryResponse{}, err
	}

	inventoryValue, err := s.statsRepo.GetInventoryValueKpi(ctx)
	if err != nil {
		return dto.KpiSummaryResponse{}, err
	}

	activity.TotalInventoryValue = inventoryValue
	return activity, nil
}

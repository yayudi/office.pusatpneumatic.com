package service

import (
	"context"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/repository"
)

type SystemLogService interface {
	GetLogs(ctx context.Context, req dto.GetSystemLogsRequest) (*dto.GetSystemLogsResponse, error)
}

type systemLogServiceImpl struct {
	systemLogRepo repository.SystemLogRepository
}

func NewSystemLogService(systemLogRepo repository.SystemLogRepository) SystemLogService {
	return &systemLogServiceImpl{
		systemLogRepo: systemLogRepo,
	}
}

func (s *systemLogServiceImpl) GetLogs(ctx context.Context, req dto.GetSystemLogsRequest) (*dto.GetSystemLogsResponse, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 {
		req.Limit = 20
	}

	data, total, err := s.systemLogRepo.GetLogs(ctx, req)
	if err != nil {
		return nil, err
	}

	return &dto.GetSystemLogsResponse{
		Data:  data,
		Total: total,
	}, nil
}

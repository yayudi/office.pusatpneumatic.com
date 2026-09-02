package service

import (
	"context"
	"encoding/json"
	"strconv"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/model"
	"github.com/dps-wmhris/backend/internal/repository"
	"github.com/jmoiron/sqlx"
)

type SalesChannelService interface {
	GetAllChannels(ctx context.Context, activeOnly bool) ([]dto.SalesChannelResponse, error)
	GetChannelByID(ctx context.Context, id int) (*dto.SalesChannelResponse, error)
	CreateChannel(ctx context.Context, req dto.CreateSalesChannelRequest, userID int, ip, userAgent string) (int, error)
	UpdateChannel(ctx context.Context, id int, req dto.UpdateSalesChannelRequest, userID int, ip, userAgent string) error
	DeleteChannel(ctx context.Context, id int, userID int, ip, userAgent string) error
}

type salesChannelServiceImpl struct {
	db                *sqlx.DB
	salesChannelRepo  repository.SalesChannelRepository
	systemLogRepo     repository.SystemLogRepository
}

func NewSalesChannelService(db *sqlx.DB, salesChannelRepo repository.SalesChannelRepository, systemLogRepo repository.SystemLogRepository) SalesChannelService {
	return &salesChannelServiceImpl{db: db, salesChannelRepo: salesChannelRepo, systemLogRepo: systemLogRepo}
}

func (s *salesChannelServiceImpl) GetAllChannels(ctx context.Context, activeOnly bool) ([]dto.SalesChannelResponse, error) {
	return s.salesChannelRepo.FindAll(ctx, activeOnly)
}

func (s *salesChannelServiceImpl) GetChannelByID(ctx context.Context, id int) (*dto.SalesChannelResponse, error) {
	return s.salesChannelRepo.FindByID(ctx, id)
}

func (s *salesChannelServiceImpl) CreateChannel(ctx context.Context, req dto.CreateSalesChannelRequest, userID int, ip, userAgent string) (int, error) {
	id, err := s.salesChannelRepo.Insert(ctx, req)
	if err != nil {
		return 0, err
	}

	changesBytes, _ := json.Marshal(req)
	changesStr := string(changesBytes)
	_ = s.systemLogRepo.Create(ctx, s.db, &model.SystemLog{
		UserID:     userID,
		Action:     "CREATE",
		TargetType: "SALES_CHANNEL",
		TargetID:   strconv.Itoa(id),
		Changes:    &changesStr,
		IP:         &ip,
		UserAgent:  &userAgent,
	})

	return id, nil
}

func (s *salesChannelServiceImpl) UpdateChannel(ctx context.Context, id int, req dto.UpdateSalesChannelRequest, userID int, ip, userAgent string) error {
	_, err := s.salesChannelRepo.Update(ctx, id, req)
	if err != nil {
		return err
	}

	changesBytes, _ := json.Marshal(req)
	changesStr := string(changesBytes)
	_ = s.systemLogRepo.Create(ctx, s.db, &model.SystemLog{
		UserID:     userID,
		Action:     "UPDATE",
		TargetType: "SALES_CHANNEL",
		TargetID:   strconv.Itoa(id),
		Changes:    &changesStr,
		IP:         &ip,
		UserAgent:  &userAgent,
	})

	return nil
}

func (s *salesChannelServiceImpl) DeleteChannel(ctx context.Context, id int, userID int, ip, userAgent string) error {
	_, err := s.salesChannelRepo.Delete(ctx, id)
	if err != nil {
		return err
	}

	changesStr := `{"note": "Sales Channel Deleted"}`
	_ = s.systemLogRepo.Create(ctx, s.db, &model.SystemLog{
		UserID:     userID,
		Action:     "DELETE",
		TargetType: "SALES_CHANNEL",
		TargetID:   strconv.Itoa(id),
		Changes:    &changesStr,
		IP:         &ip,
		UserAgent:  &userAgent,
	})

	return nil
}

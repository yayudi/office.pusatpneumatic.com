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

type StickerTemplateService interface {
	GetAllStickerTemplates(ctx context.Context) ([]dto.StickerTemplateResponse, error)
	GetStickerTemplateByID(ctx context.Context, id int) (*dto.StickerTemplateResponse, error)
	CreateStickerTemplate(ctx context.Context, req dto.CreateStickerTemplateRequest, userID int, ip, userAgent string) (int, error)
	UpdateStickerTemplate(ctx context.Context, id int, req dto.UpdateStickerTemplateRequest, userID int, ip, userAgent string) error
	DeleteStickerTemplate(ctx context.Context, id int, userID int, ip, userAgent string) error
}

type stickerTemplateServiceImpl struct {
	db                  *sqlx.DB
	stickerTemplateRepo repository.StickerTemplateRepository
	systemLogRepo       repository.SystemLogRepository
}

func NewStickerTemplateService(db *sqlx.DB, stickerTemplateRepo repository.StickerTemplateRepository, systemLogRepo repository.SystemLogRepository) StickerTemplateService {
	return &stickerTemplateServiceImpl{db: db, stickerTemplateRepo: stickerTemplateRepo, systemLogRepo: systemLogRepo}
}

func (s *stickerTemplateServiceImpl) GetAllStickerTemplates(ctx context.Context) ([]dto.StickerTemplateResponse, error) {
	return s.stickerTemplateRepo.FindAll(ctx)
}

func (s *stickerTemplateServiceImpl) GetStickerTemplateByID(ctx context.Context, id int) (*dto.StickerTemplateResponse, error) {
	return s.stickerTemplateRepo.FindByID(ctx, id)
}

func (s *stickerTemplateServiceImpl) CreateStickerTemplate(ctx context.Context, req dto.CreateStickerTemplateRequest, userID int, ip, userAgent string) (int, error) {
	var configJsonStr *string
	if req.ConfigJSON != nil {
		bytes, _ := json.Marshal(req.ConfigJSON)
		str := string(bytes)
		configJsonStr = &str
	}

	id, err := s.stickerTemplateRepo.Insert(ctx, req, configJsonStr)
	if err != nil {
		return 0, err
	}

	changesBytes, _ := json.Marshal(req)
	changesStr := string(changesBytes)
	_ = s.systemLogRepo.Create(ctx, s.db, &model.SystemLog{
		UserID:     userID,
		Action:     "CREATE",
		TargetType: "STICKER_TEMPLATE",
		TargetID:   strconv.Itoa(id),
		Changes:    &changesStr,
		IP:         &ip,
		UserAgent:  &userAgent,
	})

	return id, nil
}

func (s *stickerTemplateServiceImpl) UpdateStickerTemplate(ctx context.Context, id int, req dto.UpdateStickerTemplateRequest, userID int, ip, userAgent string) error {
	var configJsonStr *string
	if req.ConfigJSON != nil {
		bytes, _ := json.Marshal(req.ConfigJSON)
		str := string(bytes)
		configJsonStr = &str
	}

	_, err := s.stickerTemplateRepo.Update(ctx, id, req, configJsonStr)
	if err != nil {
		return err
	}

	changesBytes, _ := json.Marshal(req)
	changesStr := string(changesBytes)
	_ = s.systemLogRepo.Create(ctx, s.db, &model.SystemLog{
		UserID:     userID,
		Action:     "UPDATE",
		TargetType: "STICKER_TEMPLATE",
		TargetID:   strconv.Itoa(id),
		Changes:    &changesStr,
		IP:         &ip,
		UserAgent:  &userAgent,
	})

	return nil
}

func (s *stickerTemplateServiceImpl) DeleteStickerTemplate(ctx context.Context, id int, userID int, ip, userAgent string) error {
	_, err := s.stickerTemplateRepo.Delete(ctx, id)
	if err != nil {
		return err
	}

	changesStr := `{"note": "Sticker Template Deleted"}`
	_ = s.systemLogRepo.Create(ctx, s.db, &model.SystemLog{
		UserID:     userID,
		Action:     "DELETE",
		TargetType: "STICKER_TEMPLATE",
		TargetID:   strconv.Itoa(id),
		Changes:    &changesStr,
		IP:         &ip,
		UserAgent:  &userAgent,
	})

	return nil
}

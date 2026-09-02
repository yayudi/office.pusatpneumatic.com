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

type PaperSizeService interface {
	GetAllPaperSizes(ctx context.Context) ([]dto.PaperSizeResponse, error)
	GetPaperSizeByID(ctx context.Context, id int) (*dto.PaperSizeResponse, error)
	CreatePaperSize(ctx context.Context, req dto.CreatePaperSizeRequest, userID int, ip, userAgent string) (int, error)
	UpdatePaperSize(ctx context.Context, id int, req dto.UpdatePaperSizeRequest, userID int, ip, userAgent string) error
	DeletePaperSize(ctx context.Context, id int, userID int, ip, userAgent string) error
}

type paperSizeServiceImpl struct {
	db               *sqlx.DB
	paperSizeRepo    repository.PaperSizeRepository
	systemLogRepo    repository.SystemLogRepository
}

func NewPaperSizeService(db *sqlx.DB, paperSizeRepo repository.PaperSizeRepository, systemLogRepo repository.SystemLogRepository) PaperSizeService {
	return &paperSizeServiceImpl{db: db, paperSizeRepo: paperSizeRepo, systemLogRepo: systemLogRepo}
}

func (s *paperSizeServiceImpl) GetAllPaperSizes(ctx context.Context) ([]dto.PaperSizeResponse, error) {
	return s.paperSizeRepo.FindAll(ctx)
}

func (s *paperSizeServiceImpl) GetPaperSizeByID(ctx context.Context, id int) (*dto.PaperSizeResponse, error) {
	return s.paperSizeRepo.FindByID(ctx, id)
}

func (s *paperSizeServiceImpl) CreatePaperSize(ctx context.Context, req dto.CreatePaperSizeRequest, userID int, ip, userAgent string) (int, error) {
	id, err := s.paperSizeRepo.Insert(ctx, req)
	if err != nil {
		return 0, err
	}

	changesBytes, _ := json.Marshal(req)
	changesStr := string(changesBytes)
	_ = s.systemLogRepo.Create(ctx, s.db, &model.SystemLog{
		UserID:     userID,
		Action:     "CREATE",
		TargetType: "PAPER_SIZE",
		TargetID:   strconv.Itoa(id),
		Changes:    &changesStr,
		IP:         &ip,
		UserAgent:  &userAgent,
	})

	return id, nil
}

func (s *paperSizeServiceImpl) UpdatePaperSize(ctx context.Context, id int, req dto.UpdatePaperSizeRequest, userID int, ip, userAgent string) error {
	_, err := s.paperSizeRepo.Update(ctx, id, req)
	if err != nil {
		return err
	}

	changesBytes, _ := json.Marshal(req)
	changesStr := string(changesBytes)
	_ = s.systemLogRepo.Create(ctx, s.db, &model.SystemLog{
		UserID:     userID,
		Action:     "UPDATE",
		TargetType: "PAPER_SIZE",
		TargetID:   strconv.Itoa(id),
		Changes:    &changesStr,
		IP:         &ip,
		UserAgent:  &userAgent,
	})

	return nil
}

func (s *paperSizeServiceImpl) DeletePaperSize(ctx context.Context, id int, userID int, ip, userAgent string) error {
	_, err := s.paperSizeRepo.Delete(ctx, id)
	if err != nil {
		return err
	}

	changesStr := `{"note": "Paper Size Deleted"}`
	_ = s.systemLogRepo.Create(ctx, s.db, &model.SystemLog{
		UserID:     userID,
		Action:     "DELETE",
		TargetType: "PAPER_SIZE",
		TargetID:   strconv.Itoa(id),
		Changes:    &changesStr,
		IP:         &ip,
		UserAgent:  &userAgent,
	})

	return nil
}

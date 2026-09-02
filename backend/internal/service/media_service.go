package service

import (
	"context"
	"fmt"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/repository"
	"github.com/jmoiron/sqlx"
)

type MediaService interface {
	SaveMediaMetadata(ctx context.Context, tx sqlx.ExtContext, asset dto.ConfirmUploadAsset, userID int) (int, error)
	GetMediaAssets(ctx context.Context, limit, offset int, filter repository.MediaFilter) ([]dto.MediaAssetResponse, int, error)
	GetMediaDetailsWithProducts(ctx context.Context, mediaID int) (*dto.MediaAssetResponse, error)
	GetMediaAssetsByIDs(ctx context.Context, mediaIDs []int) ([]dto.MediaAssetResponse, error)
	DeleteMediaAsset(ctx context.Context, tx sqlx.ExtContext, mediaID int) (mainPath string, thumbPath string, err error)
	InsertTrashQueue(ctx context.Context, tx sqlx.ExtContext, r2Key string) error
	UpdateMediaTags(ctx context.Context, tx sqlx.ExtContext, mediaID int, tags []string) error
	UpdateMediaTitle(ctx context.Context, tx sqlx.ExtContext, mediaID int, title string) error
}

type mediaServiceImpl struct {
	mediaRepo repository.MediaRepository
}

func NewMediaService(mediaRepo repository.MediaRepository) MediaService {
	return &mediaServiceImpl{mediaRepo: mediaRepo}
}

// DuplicateError is a custom error indicating the media hash already exists
type DuplicateError struct {
	DuplicateOf int
}

func (e DuplicateError) Error() string {
	return fmt.Sprintf("Duplicate media of %d", e.DuplicateOf)
}

func (s *mediaServiceImpl) SaveMediaMetadata(ctx context.Context, tx sqlx.ExtContext, asset dto.ConfirmUploadAsset, userID int) (int, error) {
	// Duplicate detection
	existingID, err := s.mediaRepo.GetMediaAssetByHash(ctx, asset.Hash)
	if err == nil && existingID != nil {
		return 0, DuplicateError{DuplicateOf: *existingID}
	}

	payload := map[string]interface{}{
		"title":         asset.Title,
		"mainPath":      asset.MainPath,
		"thumbnailPath": asset.ThumbnailPath,
		"status":        "COMPLETED",
		"uploaderId":    userID,
		"tags":          asset.Tags,
		"hash":          asset.Hash,
		"duplicateOf":   nil,
		"sizeBytes":     asset.SizeBytes,
		"width":         asset.Width,
		"height":        asset.Height,
	}

	return s.mediaRepo.CreateMediaAsset(ctx, tx, payload)
}

func (s *mediaServiceImpl) GetMediaAssets(ctx context.Context, limit, offset int, filter repository.MediaFilter) ([]dto.MediaAssetResponse, int, error) {
	assets, err := s.mediaRepo.GetMediaAssets(ctx, limit, offset, filter)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.mediaRepo.GetTotalMediaAssets(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	return assets, total, nil
}

func (s *mediaServiceImpl) GetMediaDetailsWithProducts(ctx context.Context, mediaID int) (*dto.MediaAssetResponse, error) {
	return s.mediaRepo.GetMediaDetailsWithProducts(ctx, mediaID)
}

func (s *mediaServiceImpl) GetMediaAssetsByIDs(ctx context.Context, mediaIDs []int) ([]dto.MediaAssetResponse, error) {
	return s.mediaRepo.GetMediaAssetsByIDs(ctx, mediaIDs)
}

func (s *mediaServiceImpl) DeleteMediaAsset(ctx context.Context, tx sqlx.ExtContext, mediaID int) (string, string, error) {
	asset, err := s.mediaRepo.GetMediaAssetByID(ctx, mediaID)
	if err != nil || asset == nil {
		return "", "", fmt.Errorf("Aset tidak ditemukan")
	}

	// Delete from DB (will throw if FK restrict hits)
	// We use the transactional connection passed here or fallback
	dbExec := tx
	_, err = dbExec.ExecContext(ctx, "DELETE FROM media_assets WHERE id = ?", mediaID)
	if err != nil {
		return "", "", err
	}

	thumbPath := ""
	if asset.ThumbnailPath != nil {
		thumbPath = *asset.ThumbnailPath
	}

	return asset.MainPath, thumbPath, nil
}

func (s *mediaServiceImpl) InsertTrashQueue(ctx context.Context, tx sqlx.ExtContext, r2Key string) error {
	if r2Key == "" {
		return nil
	}
	_, err := tx.ExecContext(ctx, "INSERT INTO r2_trash_queue (r2_key) VALUES (?)", r2Key)
	return err
}

func (s *mediaServiceImpl) UpdateMediaTags(ctx context.Context, tx sqlx.ExtContext, mediaID int, tags []string) error {
	return s.mediaRepo.UpdateMediaTags(ctx, mediaID, tags) // Using simple repo call, tx if needed can be added
}

func (s *mediaServiceImpl) UpdateMediaTitle(ctx context.Context, tx sqlx.ExtContext, mediaID int, title string) error {
	return s.mediaRepo.UpdateMediaTitle(ctx, mediaID, title)
}

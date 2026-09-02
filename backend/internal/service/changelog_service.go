package service

import (
	"context"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/repository"
)

type ChangelogService interface {
	GetChangelogs(ctx context.Context) ([]dto.ChangelogResponse, error)
}

type changelogServiceImpl struct {
	changelogRepo repository.ChangelogRepository
}

func NewChangelogService(changelogRepo repository.ChangelogRepository) ChangelogService {
	return &changelogServiceImpl{changelogRepo: changelogRepo}
}

func (s *changelogServiceImpl) GetChangelogs(ctx context.Context) ([]dto.ChangelogResponse, error) {
	return s.changelogRepo.FindAll(ctx)
}

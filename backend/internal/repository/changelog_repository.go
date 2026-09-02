package repository

import (
	"context"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/jmoiron/sqlx"
)

type ChangelogRepository interface {
	FindAll(ctx context.Context) ([]dto.ChangelogResponse, error)
}

type changelogRepositoryImpl struct {
	db *sqlx.DB
}

func NewChangelogRepository(db *sqlx.DB) ChangelogRepository {
	return &changelogRepositoryImpl{db: db}
}

func (r *changelogRepositoryImpl) FindAll(ctx context.Context) ([]dto.ChangelogResponse, error) {
	query := `
		SELECT id, version, title, description, type, release_date, created_at 
		FROM system_changelogs 
		ORDER BY release_date DESC, id DESC
	`
	var logs []dto.ChangelogResponse
	err := r.db.SelectContext(ctx, &logs, query)
	if err != nil {
		return nil, err
	}
	if logs == nil {
		logs = []dto.ChangelogResponse{}
	}
	return logs, nil
}

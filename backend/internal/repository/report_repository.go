package repository

import (
	"context"

	"github.com/dps-wmhris/backend/internal/model"
	"github.com/jmoiron/sqlx"
)

type ReportRepository interface {
	GetDistinctBuildings(ctx context.Context) ([]string, error)
	GetDistinctPurposes(ctx context.Context) ([]string, error)
	GetBuildingPurposeRelations(ctx context.Context) ([]map[string]interface{}, error)
	GetUserExportJobs(ctx context.Context, userID int) ([]model.ExportJob, error)
}

type reportRepositoryImpl struct {
	db *sqlx.DB
}

func NewReportRepository(db *sqlx.DB) ReportRepository {
	return &reportRepositoryImpl{db: db}
}

func (r *reportRepositoryImpl) GetDistinctBuildings(ctx context.Context) ([]string, error) {
	query := "SELECT DISTINCT building FROM locations WHERE building IS NOT NULL AND building != '' ORDER BY building ASC"
	var buildings []string
	err := r.db.SelectContext(ctx, &buildings, query)
	return buildings, err
}

func (r *reportRepositoryImpl) GetDistinctPurposes(ctx context.Context) ([]string, error) {
	query := "SELECT DISTINCT purpose FROM locations WHERE purpose IS NOT NULL AND purpose != '' ORDER BY purpose ASC"
	var purposes []string
	err := r.db.SelectContext(ctx, &purposes, query)
	return purposes, err
}

func (r *reportRepositoryImpl) GetBuildingPurposeRelations(ctx context.Context) ([]map[string]interface{}, error) {
	query := "SELECT DISTINCT purpose, building FROM locations WHERE purpose IS NOT NULL AND building IS NOT NULL AND purpose != '' AND building != ''"
	rows, err := r.db.QueryxContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		row := make(map[string]interface{})
		if err := rows.MapScan(row); err != nil {
			return nil, err
		}
		// Convert byte slices to strings
		for k, v := range row {
			if b, ok := v.([]byte); ok {
				row[k] = string(b)
			}
		}
		results = append(results, row)
	}
	return results, nil
}

func (r *reportRepositoryImpl) GetUserExportJobs(ctx context.Context, userID int) ([]model.ExportJob, error) {
	query := `
		SELECT id, status, file_path, error_message, created_at, filters
		FROM export_jobs
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT 20
	`
	var jobs []model.ExportJob
	err := r.db.SelectContext(ctx, &jobs, query, userID)
	return jobs, err
}

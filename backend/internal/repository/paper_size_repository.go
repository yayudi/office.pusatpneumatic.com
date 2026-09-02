package repository

import (
	"context"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/jmoiron/sqlx"
)

type PaperSizeRepository interface {
	FindAll(ctx context.Context) ([]dto.PaperSizeResponse, error)
	FindByID(ctx context.Context, id int) (*dto.PaperSizeResponse, error)
	Insert(ctx context.Context, req dto.CreatePaperSizeRequest) (int, error)
	Update(ctx context.Context, id int, req dto.UpdatePaperSizeRequest) (int, error)
	Delete(ctx context.Context, id int) (int, error)
}

type paperSizeRepositoryImpl struct {
	db *sqlx.DB
}

func NewPaperSizeRepository(db *sqlx.DB) PaperSizeRepository {
	return &paperSizeRepositoryImpl{db: db}
}

func (r *paperSizeRepositoryImpl) FindAll(ctx context.Context) ([]dto.PaperSizeResponse, error) {
	query := "SELECT id, name, top_margin, side_margin, vertical_pitch, horizontal_pitch, label_width, label_height, number_across, number_down, page_width, page_height, is_active FROM paper_sizes ORDER BY id DESC"
	var sizes []dto.PaperSizeResponse
	err := r.db.SelectContext(ctx, &sizes, query)
	if err != nil {
		return nil, err
	}
	if sizes == nil {
		sizes = []dto.PaperSizeResponse{}
	}
	return sizes, nil
}

func (r *paperSizeRepositoryImpl) FindByID(ctx context.Context, id int) (*dto.PaperSizeResponse, error) {
	query := "SELECT id, name, top_margin, side_margin, vertical_pitch, horizontal_pitch, label_width, label_height, number_across, number_down, page_width, page_height, is_active FROM paper_sizes WHERE id = ?"
	var size dto.PaperSizeResponse
	err := r.db.GetContext(ctx, &size, query, id)
	if err != nil {
		return nil, err
	}
	return &size, nil
}

func (r *paperSizeRepositoryImpl) Insert(ctx context.Context, req dto.CreatePaperSizeRequest) (int, error) {
	query := `
		INSERT INTO paper_sizes (
			name, top_margin, side_margin, vertical_pitch, horizontal_pitch,
			label_width, label_height, number_across, number_down, page_width, page_height
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	res, err := r.db.ExecContext(ctx, query,
		req.Name, req.TopMargin, req.SideMargin, req.VerticalPitch, req.HorizontalPitch,
		req.LabelWidth, req.LabelHeight, req.NumberAcross, req.NumberDown, req.PageWidth, req.PageHeight,
	)
	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	return int(id), err
}

func (r *paperSizeRepositoryImpl) Update(ctx context.Context, id int, req dto.UpdatePaperSizeRequest) (int, error) {
	query := `
		UPDATE paper_sizes SET
			name = ?, top_margin = ?, side_margin = ?, vertical_pitch = ?, horizontal_pitch = ?,
			label_width = ?, label_height = ?, number_across = ?, number_down = ?, page_width = ?, page_height = ?
		WHERE id = ?
	`
	res, err := r.db.ExecContext(ctx, query,
		req.Name, req.TopMargin, req.SideMargin, req.VerticalPitch, req.HorizontalPitch,
		req.LabelWidth, req.LabelHeight, req.NumberAcross, req.NumberDown, req.PageWidth, req.PageHeight,
		id,
	)
	if err != nil {
		return 0, err
	}
	affected, err := res.RowsAffected()
	return int(affected), err
}

func (r *paperSizeRepositoryImpl) Delete(ctx context.Context, id int) (int, error) {
	query := "DELETE FROM paper_sizes WHERE id = ?"
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return 0, err
	}
	affected, err := res.RowsAffected()
	return int(affected), err
}

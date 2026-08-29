package repository

import (
	"context"

	"github.com/dps-wmhris/backend/internal/model"
	"github.com/jmoiron/sqlx"
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
	FindByID(ctx context.Context, id int) (*model.User, error)
	FindByUsername(ctx context.Context, username string) (*model.User, error)
}

type userRepositoryImpl struct {
	db *sqlx.DB
}

// NewUserRepository injects the database dependency
func NewUserRepository(db *sqlx.DB) UserRepository {
	return &userRepositoryImpl{db: db}
}

func (r *userRepositoryImpl) FindByID(ctx context.Context, id int) (*model.User, error) {
	var user model.User
	query := `
		SELECT 
			id, username, nickname, is_active, password_hash, role_id, 
			shift_id, created_at, updated_at, exclude_from_attendance 
		FROM users 
		WHERE id = ?`
	
	err := r.db.GetContext(ctx, &user, query, id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepositoryImpl) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	var user model.User
	query := `
		SELECT 
			id, username, nickname, is_active, password_hash, role_id, 
			shift_id, created_at, updated_at, exclude_from_attendance 
		FROM users 
		WHERE username = ? LIMIT 1`
		
	err := r.db.GetContext(ctx, &user, query, username)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

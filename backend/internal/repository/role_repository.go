package repository

import (
	"context"

	"github.com/dps-wmhris/backend/internal/model"
	"github.com/jmoiron/sqlx"
)

// RoleRepository defines the interface for role data operations
type RoleRepository interface {
	FindByID(ctx context.Context, id int) (*model.Role, error)
	FindAll(ctx context.Context) ([]model.Role, error)
}

type roleRepositoryImpl struct {
	db *sqlx.DB
}

// NewRoleRepository injects the database dependency
func NewRoleRepository(db *sqlx.DB) RoleRepository {
	return &roleRepositoryImpl{db: db}
}

func (r *roleRepositoryImpl) FindByID(ctx context.Context, id int) (*model.Role, error) {
	var role model.Role
	query := "SELECT id, name, description FROM roles WHERE id = ?"
	err := r.db.GetContext(ctx, &role, query, id)
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *roleRepositoryImpl) FindAll(ctx context.Context) ([]model.Role, error) {
	var roles []model.Role
	query := "SELECT id, name, description FROM roles"
	err := r.db.SelectContext(ctx, &roles, query)
	return roles, err
}

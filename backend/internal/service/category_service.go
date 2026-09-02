package service

import (
	"context"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/model"
	"github.com/dps-wmhris/backend/internal/repository"
)

type CategoryService interface {
	CreateCategory(ctx context.Context, req dto.CreateCategoryRequest) (*model.Category, error)
	GetActiveCategories(ctx context.Context) ([]model.Category, error)
	UpdateCategory(ctx context.Context, id int, req dto.UpdateCategoryRequest) error
	DeleteCategory(ctx context.Context, id int) error
}

type categoryServiceImpl struct {
	categoryRepo repository.CategoryRepository
}

func NewCategoryService(categoryRepo repository.CategoryRepository) CategoryService {
	return &categoryServiceImpl{categoryRepo: categoryRepo}
}

func (s *categoryServiceImpl) CreateCategory(ctx context.Context, req dto.CreateCategoryRequest) (*model.Category, error) {
	category := &model.Category{
		Name:     req.Name,
		IsActive: *req.IsActive,
	}

	err := s.categoryRepo.Create(ctx, category)
	if err != nil {
		return nil, err
	}

	return category, nil
}

func (s *categoryServiceImpl) GetActiveCategories(ctx context.Context) ([]model.Category, error) {
	return s.categoryRepo.FindAllActive(ctx)
}

func (s *categoryServiceImpl) UpdateCategory(ctx context.Context, id int, req dto.UpdateCategoryRequest) error {
	return s.categoryRepo.Update(ctx, id, req.Name)
}

func (s *categoryServiceImpl) DeleteCategory(ctx context.Context, id int) error {
	return s.categoryRepo.Delete(ctx, id)
}

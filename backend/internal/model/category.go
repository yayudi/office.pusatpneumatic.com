package model

type Category struct {
	BaseEntity
	Name     string `db:"name" json:"name"`
	IsActive bool   `db:"is_active" json:"is_active"`
}

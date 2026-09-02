package repository

import (
	"context"

	"github.com/dps-wmhris/backend/internal/model"
	"github.com/jmoiron/sqlx"
)

type StockRequestRepository interface {
	FindAll(ctx context.Context) ([]model.StockRequest, error)
	FindByID(ctx context.Context, id int) (*model.StockRequest, error)
	CreateTx(ctx context.Context, ext sqlx.ExtContext, request *model.StockRequest) error
	CreateItemTx(ctx context.Context, ext sqlx.ExtContext, item *model.StockRequestItem) error
	UpdateStatusTx(ctx context.Context, ext sqlx.ExtContext, id int, status string) error
	UpdateItemReceivedQtyTx(ctx context.Context, ext sqlx.ExtContext, itemID int, qty int) error
	FindItemsByRequestID(ctx context.Context, reqID int) ([]model.StockRequestItem, error)
}

type stockRequestRepositoryImpl struct {
	db *sqlx.DB
}

func NewStockRequestRepository(db *sqlx.DB) StockRequestRepository {
	return &stockRequestRepositoryImpl{db: db}
}

func (r *stockRequestRepositoryImpl) FindAll(ctx context.Context) ([]model.StockRequest, error) {
	var requests []model.StockRequest
	query := `
		SELECT 
			sr.id, sr.request_number, sr.type, sr.requester_id, sr.from_location_id, 
			sr.to_location_id, sr.status, sr.notes, sr.created_at, sr.updated_at,
			u.username as requester_name,
			COALESCE(l1.name, '') as from_location_name, COALESCE(l1.code, '') as from_location_code,
			COALESCE(l2.name, '') as to_location_name, COALESCE(l2.code, '') as to_location_code
		FROM stock_requests sr
		LEFT JOIN users u ON sr.requester_id = u.id
		LEFT JOIN locations l1 ON sr.from_location_id = l1.id
		LEFT JOIN locations l2 ON sr.to_location_id = l2.id
		ORDER BY sr.created_at DESC`
	
	err := r.db.SelectContext(ctx, &requests, query)
	if err != nil {
		return nil, err
	}

	// For FindAll, we might not want to fetch items for every single request due to N+1,
	// but the node implementation fetches all items where stock_request_id IN (...)
	if len(requests) > 0 {
		var reqIDs []int
		for _, req := range requests {
			reqIDs = append(reqIDs, req.ID)
		}

		queryItems, args, err := sqlx.In(`
			SELECT sri.*, p.name as product_name, p.sku
			FROM stock_request_items sri
			JOIN products p ON sri.product_id = p.id
			WHERE sri.stock_request_id IN (?)`, reqIDs)
		
		if err == nil {
			queryItems = r.db.Rebind(queryItems)
			var items []model.StockRequestItem
			if err := r.db.SelectContext(ctx, &items, queryItems, args...); err == nil {
				// Group by request ID
				itemsMap := make(map[int][]model.StockRequestItem)
				for _, item := range items {
					itemsMap[item.StockRequestID] = append(itemsMap[item.StockRequestID], item)
				}
				for i, req := range requests {
					if reqItems, ok := itemsMap[req.ID]; ok {
						requests[i].Items = reqItems
					} else {
						requests[i].Items = []model.StockRequestItem{}
					}
				}
			}
		}
	}

	return requests, nil
}

func (r *stockRequestRepositoryImpl) FindByID(ctx context.Context, id int) (*model.StockRequest, error) {
	var request model.StockRequest
	query := `
		SELECT 
			sr.id, sr.request_number, sr.type, sr.requester_id, sr.from_location_id, 
			sr.to_location_id, sr.status, sr.notes, sr.created_at, sr.updated_at,
			u.username as requester_name,
			COALESCE(l1.name, '') as from_location_name, COALESCE(l1.code, '') as from_location_code,
			COALESCE(l2.name, '') as to_location_name, COALESCE(l2.code, '') as to_location_code
		FROM stock_requests sr
		LEFT JOIN users u ON sr.requester_id = u.id
		LEFT JOIN locations l1 ON sr.from_location_id = l1.id
		LEFT JOIN locations l2 ON sr.to_location_id = l2.id
		WHERE sr.id = ?`
		
	err := r.db.GetContext(ctx, &request, query, id)
	if err != nil {
		return nil, err
	}
	
	items, err := r.FindItemsByRequestID(ctx, request.ID)
	if err == nil && items != nil {
		request.Items = items
	} else {
		request.Items = []model.StockRequestItem{}
	}

	return &request, nil
}

func (r *stockRequestRepositoryImpl) CreateTx(ctx context.Context, ext sqlx.ExtContext, request *model.StockRequest) error {
	if ext == nil {
		ext = r.db
	}
	query := `
		INSERT INTO stock_requests (
			request_number, type, requester_id, from_location_id, 
			to_location_id, status, notes, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`
		
	res, err := ext.ExecContext(ctx, query,
		request.RequestNumber, request.Type, request.RequesterID,
		request.FromLocationID, request.ToLocationID, request.Status,
		request.Notes,
	)
	
	if err != nil {
		return err
	}
	
	id, err := res.LastInsertId()
	if err == nil {
		request.ID = int(id)
	}
	return err
}

func (r *stockRequestRepositoryImpl) CreateItemTx(ctx context.Context, ext sqlx.ExtContext, item *model.StockRequestItem) error {
	if ext == nil {
		ext = r.db
	}
	query := `
		INSERT INTO stock_request_items (
			stock_request_id, product_id, quantity, received_quantity
		) VALUES (?, ?, ?, ?)`
		
	res, err := ext.ExecContext(ctx, query, item.StockRequestID, item.ProductID, item.Quantity, item.ReceivedQuantity)
	if err != nil {
		return err
	}
	
	id, err := res.LastInsertId()
	if err == nil {
		item.ID = int(id)
	}
	return err
}

func (r *stockRequestRepositoryImpl) UpdateStatusTx(ctx context.Context, ext sqlx.ExtContext, id int, status string) error {
	if ext == nil {
		ext = r.db
	}
	query := `UPDATE stock_requests SET status = ?, updated_at = NOW() WHERE id = ?`
	_, err := ext.ExecContext(ctx, query, status, id)
	return err
}

func (r *stockRequestRepositoryImpl) UpdateItemReceivedQtyTx(ctx context.Context, ext sqlx.ExtContext, itemID int, qty int) error {
	if ext == nil {
		ext = r.db
	}
	query := `UPDATE stock_request_items SET received_quantity = ? WHERE id = ?`
	_, err := ext.ExecContext(ctx, query, qty, itemID)
	return err
}

func (r *stockRequestRepositoryImpl) FindItemsByRequestID(ctx context.Context, reqID int) ([]model.StockRequestItem, error) {
	var items []model.StockRequestItem
	query := `
		SELECT sri.*, p.name as product_name, p.sku
		FROM stock_request_items sri
		JOIN products p ON sri.product_id = p.id
		WHERE sri.stock_request_id = ?`
	
	err := r.db.SelectContext(ctx, &items, query, reqID)
	return items, err
}

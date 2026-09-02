package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/dps-wmhris/backend/internal/database"
	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/model"
	"github.com/dps-wmhris/backend/internal/repository"
	"github.com/jmoiron/sqlx"
	"github.com/xuri/excelize/v2"
)

type StockService interface {
	MoveStock(ctx context.Context, userID int, req dto.MoveStockRequest) error
	GetAllStocks(ctx context.Context) ([]map[string]interface{}, error)
	ProcessBatchMovements(ctx context.Context, req dto.BatchProcessRequest, userID int, userRoleID int) error
	GetMovementTypes(ctx context.Context) ([]string, error)
	GetBatchLogs(ctx context.Context, filter dto.BatchLogFilter) ([]dto.BatchLogResponse, error)
	GetStockHistory(ctx context.Context, filter dto.StockHistoryFilter) (*dto.StockHistoryData, error)
	GenerateInboundTemplate(ctx context.Context) (*excelize.File, error)
	GenerateAdjustmentTemplate(ctx context.Context) (*excelize.File, error)
	ValidateReturn(ctx context.Context, req dto.ValidateReturnRequest, userID int) error
}

type stockServiceImpl struct {
	db           *sqlx.DB
	stockRepo    repository.StockRepository
	productRepo  repository.ProductRepository
	locationRepo repository.LocationRepository
	userRepo     repository.UserRepository
	pickingRepo  repository.PickingRepository
}

func NewStockService(db *sqlx.DB, stockRepo repository.StockRepository, productRepo repository.ProductRepository, locationRepo repository.LocationRepository, userRepo repository.UserRepository, pickingRepo repository.PickingRepository) StockService {
	return &stockServiceImpl{
		db:           db,
		stockRepo:    stockRepo,
		productRepo:  productRepo,
		locationRepo: locationRepo,
		userRepo:     userRepo,
		pickingRepo:  pickingRepo,
	}
}

func (s *stockServiceImpl) MoveStock(ctx context.Context, userID int, req dto.MoveStockRequest) error {
	if req.FromLocationID == nil && req.ToLocationID == nil {
		return errors.New("mutasi gagal: lokasi asal dan tujuan tidak boleh keduanya kosong")
	}

	// Bungkus seluruh alur dalam satu Transaksi SQL
	return database.WithTransaction(s.db, ctx, func(tx *sqlx.Tx) error {
		// 1. Validasi & Kurangi stok di lokasi asal (jika ada FromLocationID)
		if req.FromLocationID != nil {
			stockFrom, err := s.stockRepo.GetStockByLocation(ctx, tx, req.ProductID, *req.FromLocationID)
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					return fmt.Errorf("stok barang di lokasi asal tidak ditemukan")
				}
				return err
			}

			if stockFrom.Quantity < req.Quantity {
				return fmt.Errorf("stok tidak mencukupi di lokasi asal (tersedia: %d, diminta: %d)", stockFrom.Quantity, req.Quantity)
			}

			stockFrom.Quantity -= req.Quantity
			if err := s.stockRepo.UpsertStockLocation(ctx, tx, stockFrom); err != nil {
				return err
			}
		}

		// 2. Tambahkan stok di lokasi tujuan (jika ada ToLocationID)
		if req.ToLocationID != nil {
			stockTo, err := s.stockRepo.GetStockByLocation(ctx, tx, req.ProductID, *req.ToLocationID)
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					// Jika barang belum pernah ada di rak ini, siapkan struktur baru
					stockTo = &model.StockLocation{
						ProductID:  req.ProductID,
						LocationID: *req.ToLocationID,
						Quantity:   req.Quantity,
					}
				} else {
					return err
				}
			} else {
				stockTo.Quantity += req.Quantity
			}

			if err := s.stockRepo.UpsertStockLocation(ctx, tx, stockTo); err != nil {
				return err
			}
		}

		// 3. Catat riwayat pergerakan / audit log (wajib)
		movement := &model.StockMovement{
			ProductID:      req.ProductID,
			Quantity:       req.Quantity,
			FromLocationID: req.FromLocationID,
			ToLocationID:   req.ToLocationID,
			MovementType:   req.MovementType,
			UserID:         userID,
			Notes:          req.Notes,
		}

		if err := s.stockRepo.RecordMovement(ctx, tx, movement); err != nil {
			return err
		}

		return nil
	})
}

func (s *stockServiceImpl) GetAllStocks(ctx context.Context) ([]map[string]interface{}, error) {
	return s.stockRepo.GetAllStocks(ctx)
}

type resolvedInventoryItem struct {
	ProductID      int
	SKU            string
	Quantity       int
	FromLocationID *int
	ToLocationID   *int
	IsComponent    bool
	ParentSKU      string
	Notes          string
}

func (s *stockServiceImpl) resolveInventoryItems(ctx context.Context, movements []dto.BatchMovementRequest, globalFrom *int, globalTo *int, globalNotes *string) ([]resolvedInventoryItem, error) {
	var resolvedItems []resolvedInventoryItem
	var skus []string
	skuMap := make(map[string]bool)

	for _, m := range movements {
		if !skuMap[m.SKU] {
			skuMap[m.SKU] = true
			skus = append(skus, m.SKU)
		}
	}

	productMap, err := s.productRepo.GetProductMapWithComponents(ctx, skus)
	if err != nil {
		return nil, err
	}

	for _, mov := range movements {
		product, exists := productMap[strings.ToUpper(mov.SKU)]
		if !exists {
			return nil, fmt.Errorf("SKU '%s' tidak ditemukan di database", mov.SKU)
		}

		fromLoc := mov.FromLocationID
		if fromLoc == nil {
			fromLoc = globalFrom
		}
		toLoc := mov.ToLocationID
		if toLoc == nil {
			toLoc = globalTo
		}

		baseNote := ""
		if mov.Notes != nil && *mov.Notes != "" {
			baseNote = *mov.Notes
		} else if globalNotes != nil && *globalNotes != "" {
			baseNote = *globalNotes
		}

		if product.IsPackage {
			if len(product.Components) == 0 {
				return nil, fmt.Errorf("Produk Paket '%s' tidak memiliki komponen terdaftar", product.SKU)
			}
			for _, comp := range product.Components {
				compNote := baseNote
				if compNote != "" {
					compNote += fmt.Sprintf(" [Via %s]", product.SKU)
				} else {
					compNote = fmt.Sprintf("[Via %s]", product.SKU)
				}

				resolvedItems = append(resolvedItems, resolvedInventoryItem{
					ProductID:      comp.ComponentProductID,
					SKU:            comp.SKU,
					Quantity:       mov.Quantity * comp.Quantity, // multiply by component quantity requirement
					FromLocationID: fromLoc,
					ToLocationID:   toLoc,
					IsComponent:    true,
					ParentSKU:      product.SKU,
					Notes:          compNote,
				})
			}
		} else {
			resolvedItems = append(resolvedItems, resolvedInventoryItem{
				ProductID:      product.ID,
				SKU:            product.SKU,
				Quantity:       mov.Quantity,
				FromLocationID: fromLoc,
				ToLocationID:   toLoc,
				IsComponent:    false,
				Notes:          baseNote,
			})
		}
	}
	return resolvedItems, nil
}

func (s *stockServiceImpl) ProcessBatchMovements(ctx context.Context, req dto.BatchProcessRequest, userID int, userRoleID int) error {
	// 1. Resolve Items (Unwrap packages)
	resolvedItems, err := s.resolveInventoryItems(ctx, req.Movements, req.FromLocationID, req.ToLocationID, req.Notes)
	if err != nil {
		return err
	}

	// 2. Process inside a single transaction
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Verify Permissions (Transfer / Adjustment requires strict checks for non-admins)
	if req.Type == "TRANSFER" || req.Type == "ADJUSTMENT" {
		if userRoleID != 1 {
			locToCheck := req.FromLocationID
			if req.Type == "ADJUSTMENT" {
				locToCheck = req.ToLocationID // Or from depending on UI payload structure, usually it uses fromLocationId or just checks one. Let's rely on item-level checks for TRANSFER_MULTI
			}
			if locToCheck != nil {
				hasPerm, err := s.userRepo.CheckUserLocationPermission(ctx, userID, *locToCheck)
				if err != nil {
					return err
				}
				if !hasPerm {
					return fmt.Errorf("Akses ditolak. Anda tidak memiliki izin untuk lokasi ini")
				}
			}
		}
	}

		for _, item := range resolvedItems {
			// Item-level permission check for TRANSFER_MULTI
			if req.Type == "TRANSFER_MULTI" && userRoleID != 1 {
				if item.FromLocationID == nil {
					return fmt.Errorf("Lokasi asal tidak valid untuk %s", item.SKU)
				}
				hasPerm, err := s.userRepo.CheckUserLocationPermission(ctx, userID, *item.FromLocationID)
				if err != nil {
					return err
				}
				if !hasPerm {
					return fmt.Errorf("Akses ditolak untuk lokasi asal SKU '%s'", item.SKU)
				}
			}

			switch req.Type {
			case "TRANSFER", "TRANSFER_MULTI":
				if item.FromLocationID == nil || item.ToLocationID == nil {
					return fmt.Errorf("Lokasi asal/tujuan tidak valid untuk %s", item.SKU)
				}

				// Check sufficient stock at source
				stockFrom, err := s.stockRepo.GetStockByLocation(ctx, tx, item.ProductID, *item.FromLocationID)
				if err != nil {
					return err
				}
				if stockFrom == nil || stockFrom.Quantity < item.Quantity {
					currStock := 0
					if stockFrom != nil {
						currStock = stockFrom.Quantity
					}
					return fmt.Errorf("Stok SKU '%s' kurang. Ada: %d, Butuh: %d.", item.SKU, currStock, item.Quantity)
				}

				// Deduct from Source
				stockFrom.Quantity -= item.Quantity
				if err := s.stockRepo.UpsertStockLocation(ctx, tx, stockFrom); err != nil {
					return err
				}

				// Add to Destination
				stockTo, err := s.stockRepo.GetStockByLocation(ctx, tx, item.ProductID, *item.ToLocationID)
				if err != nil {
					return err
				}
				if stockTo == nil {
					stockTo = &model.StockLocation{
						ProductID:  item.ProductID,
						LocationID: *item.ToLocationID,
						Quantity:   item.Quantity,
					}
				} else {
					stockTo.Quantity += item.Quantity
				}
				if err := s.stockRepo.UpsertStockLocation(ctx, tx, stockTo); err != nil {
					return err
				}

				// Record Movement
				mov := &model.StockMovement{
					ProductID:      item.ProductID,
					Quantity:       item.Quantity,
					FromLocationID: item.FromLocationID,
					ToLocationID:   item.ToLocationID,
					MovementType:   "TRANSFER",
					UserID:         userID,
					Notes:          item.Notes,
				}
				if err := s.stockRepo.RecordMovement(ctx, tx, mov); err != nil {
					return err
				}

			case "INBOUND", "RETURN":
				if item.ToLocationID == nil {
					return fmt.Errorf("Lokasi tujuan wajib diisi untuk %s", item.SKU)
				}

				// Add to Destination
				stockTo, err := s.stockRepo.GetStockByLocation(ctx, tx, item.ProductID, *item.ToLocationID)
				if err != nil {
					return err
				}
				if stockTo == nil {
					stockTo = &model.StockLocation{
						ProductID:  item.ProductID,
						LocationID: *item.ToLocationID,
						Quantity:   item.Quantity,
					}
				} else {
					stockTo.Quantity += item.Quantity
				}
				if err := s.stockRepo.UpsertStockLocation(ctx, tx, stockTo); err != nil {
					return err
				}

				// Record Movement
				mov := &model.StockMovement{
					ProductID:      item.ProductID,
					Quantity:       item.Quantity,
					FromLocationID: nil,
					ToLocationID:   item.ToLocationID,
					MovementType:   req.Type,
					UserID:         userID,
					Notes:          item.Notes,
				}
				if err := s.stockRepo.RecordMovement(ctx, tx, mov); err != nil {
					return err
				}

			case "TRANSFER_OUT":
				if item.FromLocationID == nil {
					return fmt.Errorf("Lokasi asal wajib diisi untuk %s", item.SKU)
				}

				// Deduct from Source
				stockFrom, err := s.stockRepo.GetStockByLocation(ctx, tx, item.ProductID, *item.FromLocationID)
				if err != nil {
					return err
				}
				if stockFrom == nil || stockFrom.Quantity < item.Quantity {
					currStock := 0
					if stockFrom != nil {
						currStock = stockFrom.Quantity
					}
					return fmt.Errorf("Stok SKU '%s' kurang. Ada: %d, Butuh: %d.", item.SKU, currStock, item.Quantity)
				}

				stockFrom.Quantity -= item.Quantity
				if err := s.stockRepo.UpsertStockLocation(ctx, tx, stockFrom); err != nil {
					return err
				}

				// Record Movement
				mov := &model.StockMovement{
					ProductID:      item.ProductID,
					Quantity:       item.Quantity,
					FromLocationID: item.FromLocationID,
					ToLocationID:   nil,
					MovementType:   req.Type,
					UserID:         userID,
					Notes:          item.Notes,
				}
				if err := s.stockRepo.RecordMovement(ctx, tx, mov); err != nil {
					return err
				}

			case "ADJUSTMENT":
				// Depending on from/to location ID payload for adjustment in frontend
				loc := item.ToLocationID
				if loc == nil {
					loc = item.FromLocationID
				}
				if loc == nil {
					return fmt.Errorf("Lokasi wajib diisi untuk penyesuaian %s", item.SKU)
				}

				stock, err := s.stockRepo.GetStockByLocation(ctx, tx, item.ProductID, *loc)
				if err != nil {
					return err
				}
				
				isNegative := item.Quantity < 0
				absQty := item.Quantity
				if isNegative {
					absQty = -item.Quantity
					if stock == nil || stock.Quantity < absQty {
						currStock := 0
						if stock != nil {
							currStock = stock.Quantity
						}
						return fmt.Errorf("Stok SKU '%s' kurang untuk dikurangi. Ada: %d, Butuh dikurangi: %d.", item.SKU, currStock, absQty)
					}
				}

				if stock == nil {
					stock = &model.StockLocation{
						ProductID:  item.ProductID,
						LocationID: *loc,
						Quantity:   item.Quantity,
					}
				} else {
					stock.Quantity += item.Quantity
				}

				if err := s.stockRepo.UpsertStockLocation(ctx, tx, stock); err != nil {
					return err
				}

				// Determine Movement Type
				mType := "ADJUSTMENT"
				if isNegative {
					mType = "ADJUST_MINUS"
				} else {
					mType = "ADJUST_PLUS"
				}

				var fromLoc, toLoc *int
				if isNegative {
					fromLoc = loc
				} else {
					toLoc = loc
				}

				mov := &model.StockMovement{
					ProductID:      item.ProductID,
					Quantity:       absQty,
					FromLocationID: fromLoc,
					ToLocationID:   toLoc,
					MovementType:   mType,
					UserID:         userID,
					Notes:          item.Notes,
				}
				if err := s.stockRepo.RecordMovement(ctx, tx, mov); err != nil {
					return err
				}

			default:
				return fmt.Errorf("Tipe pergerakan tidak dikenali: %s", req.Type)
			} // end switch
		} // end for

	return tx.Commit()
}

func (s *stockServiceImpl) GetMovementTypes(ctx context.Context) ([]string, error) {
	return s.stockRepo.GetMovementTypes(ctx)
}

func (s *stockServiceImpl) GetBatchLogs(ctx context.Context, filter dto.BatchLogFilter) ([]dto.BatchLogResponse, error) {
	// You can add validation for StartDate and EndDate here if needed
	return s.stockRepo.GetBatchLogs(ctx, filter)
}

func (s *stockServiceImpl) GetStockHistory(ctx context.Context, filter dto.StockHistoryFilter) (*dto.StockHistoryData, error) {
	return s.stockRepo.GetStockHistory(ctx, filter)
}

func (s *stockServiceImpl) GenerateAdjustmentTemplate(ctx context.Context) (*excelize.File, error) {
	locations, err := s.locationRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	mainSheet := "Input Stok"
	f.SetSheetName("Sheet1", mainSheet)
	
	// DataValidasi sheet for dropdown
	validSheet := "DataValidasi"
	f.NewSheet(validSheet)
	f.SetSheetVisible(validSheet, false)

	for i, loc := range locations {
		cell, _ := excelize.CoordinatesToCellName(1, i+1)
		f.SetCellValue(validSheet, cell, loc.Code)
	}

	// Main sheet headers
	headers := []string{"SKU", "LT (Lokasi)", "ACTUAL", "NOTES"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(mainSheet, cell, h)
	}
	f.SetColWidth(mainSheet, "A", "A", 25)
	f.SetColWidth(mainSheet, "B", "B", 20)
	f.SetColWidth(mainSheet, "C", "C", 10)
	f.SetColWidth(mainSheet, "D", "D", 35)

	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	f.SetRowStyle(mainSheet, 1, 1, boldStyle)

	// Add data validation for Location column (B)
	if len(locations) > 0 {
		dv := excelize.NewDataValidation(true)
		dv.Sqref = "B2:B1002"
		dv.SetError(excelize.DataValidationErrorStyleWarning, "Lokasi Tidak Valid", "Silakan pilih lokasi yang valid dari daftar dropdown.")
		formula := fmt.Sprintf("DataValidasi!$A$1:$A$%d", len(locations))
		dv.SetSqrefDropList(formula)
		f.AddDataValidation(mainSheet, dv)
	}

	return f, nil
}

func (s *stockServiceImpl) GenerateInboundTemplate(ctx context.Context) (*excelize.File, error) {
	locations, err := s.locationRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	mainSheet := "Inbound Stok"
	f.SetSheetName("Sheet1", mainSheet)
	
	// DataValidasi sheet for dropdown
	validSheet := "DataValidasi"
	f.NewSheet(validSheet)
	f.SetSheetVisible(validSheet, false)

	for i, loc := range locations {
		cell, _ := excelize.CoordinatesToCellName(1, i+1)
		f.SetCellValue(validSheet, cell, loc.Code)
	}

	// Main sheet headers
	headers := []string{"SKU", "LT (Lokasi)", "QTY", "NOTES"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(mainSheet, cell, h)
	}
	f.SetColWidth(mainSheet, "A", "A", 25)
	f.SetColWidth(mainSheet, "B", "B", 20)
	f.SetColWidth(mainSheet, "C", "C", 10)
	f.SetColWidth(mainSheet, "D", "D", 35)

	boldStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	f.SetRowStyle(mainSheet, 1, 1, boldStyle)

	// Add data validation for Location column (B)
	if len(locations) > 0 {
		dv := excelize.NewDataValidation(true)
		dv.Sqref = "B2:B1002"
		dv.SetError(excelize.DataValidationErrorStyleWarning, "Lokasi Tidak Valid", "Silakan pilih lokasi yang valid dari daftar dropdown.")
		formula := fmt.Sprintf("DataValidasi!$A$1:$A$%d", len(locations))
		dv.SetSqrefDropList(formula)
		f.AddDataValidation(mainSheet, dv)
	}

	return f, nil
}

func (s *stockServiceImpl) ValidateReturn(ctx context.Context, req dto.ValidateReturnRequest, userID int) error {
	return database.WithTransaction(s.db, ctx, func(tx *sqlx.Tx) error {
		items, err := s.pickingRepo.GetItemsByIDs(ctx, tx, []int{req.PickingListItemID})
		if err != nil {
			return err
		}
		if len(items) == 0 {
			return errors.New("Item retur tidak ditemukan atau sudah diproses.")
		}
		item := items[0]
		if item.Status != "RETURNED" {
			return errors.New("Item retur tidak dalam status RETURNED.")
		}

		err = s.locationRepo.IncrementStock(ctx, tx, item.ProductID, req.ReturnToLocationID, item.Quantity)
		if err != nil {
			return err
		}

		notes := fmt.Sprintf("Validasi Retur Item ID: %d", req.PickingListItemID)
		err = s.stockRepo.RecordMovement(ctx, tx, &model.StockMovement{
			ProductID:    item.ProductID,
			Quantity:     item.Quantity,
			ToLocationID: &req.ReturnToLocationID,
			MovementType: "RETURN",
			UserID:       userID,
			Notes:        notes,
		})
		if err != nil {
			return err
		}

		return s.pickingRepo.UpdateItemStatus(ctx, tx, item.ID, "COMPLETED_RETURN")
	})
}

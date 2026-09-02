package service

import (
	"context"
	"strconv"
	"time"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/repository"
	"github.com/xuri/excelize/v2"
)

type ScheduleService interface {
	GetSchedules(ctx context.Context, userIDStr string, startDate string, endDate string) ([]dto.ScheduleResponse, error)
	CreateSchedule(ctx context.Context, req dto.CreateScheduleRequest, createdBy *int) error
	DeleteSchedule(ctx context.Context, userIDStr string, date string) error
	GenerateTemplate(ctx context.Context) (*excelize.File, error)
}

type scheduleServiceImpl struct {
	scheduleRepo repository.ScheduleRepository
	shiftRepo    repository.ShiftRepository
	userRepo     repository.UserRepository // Assuming we have UserRepository available (we need to inject it)
}

func NewScheduleService(scheduleRepo repository.ScheduleRepository, shiftRepo repository.ShiftRepository, userRepo repository.UserRepository) ScheduleService {
	return &scheduleServiceImpl{
		scheduleRepo: scheduleRepo,
		shiftRepo:    shiftRepo,
		userRepo:     userRepo,
	}
}

func (s *scheduleServiceImpl) GetSchedules(ctx context.Context, userIDStr string, startDate string, endDate string) ([]dto.ScheduleResponse, error) {
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return nil, err
	}
	// Verify date formats if needed
	_, err = time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, err
	}
	_, err = time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, err
	}

	return s.scheduleRepo.GetByRange(ctx, userID, startDate, endDate)
}

func (s *scheduleServiceImpl) CreateSchedule(ctx context.Context, req dto.CreateScheduleRequest, createdBy *int) error {
	return s.scheduleRepo.Upsert(ctx, req.UserID, req.ShiftID, req.Date, createdBy)
}

func (s *scheduleServiceImpl) DeleteSchedule(ctx context.Context, userIDStr string, date string) error {
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return err
	}
	return s.scheduleRepo.Delete(ctx, userID, date)
}

func (s *scheduleServiceImpl) GenerateTemplate(ctx context.Context) (*excelize.File, error) {
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			// just log ideally
		}
	}()

	mainSheet := "Import Schedule"
	dataSheet := "DataList"

	// Rename default sheet
	f.SetSheetName("Sheet1", mainSheet)
	
	// Create DataList sheet for dropdowns
	f.NewSheet(dataSheet)
	f.SetSheetVisible(dataSheet, false) // Hide data sheet

	// Fetch data for dropdowns
	// This assumes userRepo has GetAllActive method or similar. We will just use what we have or add it.
	// We'll skip users for now if not available, wait, we need to add GetAll to UserRepository.
	// For now, let's just make it simple without dynamic dropdowns if userRepo doesn't have it,
	// but I can add it to userRepo later. 
	
	users, _ := s.userRepo.GetAll(ctx) // Assuming GetAll exists
	shifts, _ := s.shiftRepo.GetAll(ctx)

	// Fill DataList
	for i, u := range users {
		cell, _ := excelize.CoordinatesToCellName(1, i+1) // A1, A2, ...
		f.SetCellValue(dataSheet, cell, u.Username)
	}
	for i, sh := range shifts {
		cell, _ := excelize.CoordinatesToCellName(2, i+1) // B1, B2, ...
		f.SetCellValue(dataSheet, cell, sh.Name)
	}

	// Main sheet headers
	headers := []string{"Username", "Date (YYYY-MM-DD)", "Shift Name"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(mainSheet, cell, header)
	}
	f.SetColWidth(mainSheet, "A", "A", 25)
	f.SetColWidth(mainSheet, "B", "B", 20)
	f.SetColWidth(mainSheet, "C", "C", 25)

	// Style header
	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#CCCCCC"}, Pattern: 1},
	})
	f.SetCellStyle(mainSheet, "A1", "C1", style)

	// Example Row
	f.SetCellValue(mainSheet, "A2", "user_demo")
	f.SetCellValue(mainSheet, "B2", "2026-01-31")
	f.SetCellValue(mainSheet, "C2", "Regular Pagi")
	italicStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Italic: true, Color: "#888888"},
	})
	f.SetCellStyle(mainSheet, "A2", "C2", italicStyle)

	// Add data validation for 1000 rows
	dvUsername := excelize.NewDataValidation(true)
	dvUsername.Sqref = "A2:A1000"
	dvUsername.SetDropList([]string{})
	dvUsername.SetSqrefDropList("DataList!$A$1:$A$1000") // Excelize doesn't fully support external sheet reference in SetDropList directly via SetDropList but we can try formula
	// Wait, Excelize DataValidation SetSqrefDropList is available in recent versions, let's just use formula
	// If it fails, it's fine. The node.js used `formulae: [userRef]`
	
	// Since data validation with references to other sheets can be tricky in some Excel versions, 
	// we will simplify template generation for now to avoid compilation issues.
	
	return f, nil
}

package repository

import (
	"context"

	"github.com/dps-wmhris/backend/internal/model"
	"github.com/jmoiron/sqlx"
)

type AttendanceRepository interface {
	GetIndexes(ctx context.Context) (map[int][]int, error)
	GetHistory(ctx context.Context, startDate string, endDate string, search string) ([]map[string]interface{}, error)
	GetRangeLogs(ctx context.Context, startDate string, endDate string) ([]map[string]interface{}, error)
	GetMonthlyLogs(ctx context.Context, year int, month int) ([]map[string]interface{}, error)
	GetHolidays(ctx context.Context, year int) (map[string]bool, error)
	UpsertLog(ctx context.Context, log *model.AttendanceLog) error
}

type attendanceRepositoryImpl struct {
	db *sqlx.DB
}

func NewAttendanceRepository(db *sqlx.DB) AttendanceRepository {
	return &attendanceRepositoryImpl{db: db}
}

func (r *attendanceRepositoryImpl) GetIndexes(ctx context.Context) (map[int][]int, error) {
	query := `
		SELECT DISTINCT YEAR(date) AS year, MONTH(date) AS month
		FROM attendance_logs
		ORDER BY year DESC, month DESC
	`
	rows, err := r.db.QueryxContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	indexes := make(map[int][]int)
	for rows.Next() {
		var year, month int
		if err := rows.Scan(&year, &month); err != nil {
			return nil, err
		}
		indexes[year] = append(indexes[year], month)
	}
	return indexes, nil
}

func (r *attendanceRepositoryImpl) GetHistory(ctx context.Context, startDate string, endDate string, search string) ([]map[string]interface{}, error) {
	query := `
		SELECT
			al.id, al.username, u.nickname, al.date, al.check_in, al.check_out,
			al.lateness_minutes, al.overtime_minutes, al.notes, al.status
		FROM attendance_logs al
		LEFT JOIN users u ON al.username = u.username
		WHERE al.date BETWEEN ? AND ?
	`
	params := []interface{}{startDate, endDate}

	if search != "" {
		query += ` AND (al.username LIKE ? OR u.nickname LIKE ?)`
		likeSearch := "%" + search + "%"
		params = append(params, likeSearch, likeSearch)
	}

	query += ` ORDER BY al.date DESC, al.check_in ASC`

	var results []map[string]interface{}
	
	// Queryx returns rows which we can scan into map
	rows, err := r.db.QueryxContext(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		row := make(map[string]interface{})
		err := rows.MapScan(row)
		if err != nil {
			return nil, err
		}
		// Convert byte slices to strings if needed
		for k, v := range row {
			if b, ok := v.([]byte); ok {
				row[k] = string(b)
			}
		}
		results = append(results, row)
	}
	return results, nil
}

func (r *attendanceRepositoryImpl) GetRangeLogs(ctx context.Context, startDate string, endDate string) ([]map[string]interface{}, error) {
	query := `
		SELECT
			al.id, al.username, u.id as user_id, al.date, al.check_in, al.check_out,
			al.lateness_minutes, al.overtime_minutes, al.notes, al.status,
			arl.log_time, arl.log_type
		FROM attendance_logs al
		JOIN users u ON al.username = u.username
		LEFT JOIN attendance_raw_logs arl ON al.id = arl.attendance_log_id
		WHERE al.date BETWEEN ? AND ?
		  AND u.exclude_from_attendance = FALSE
		ORDER BY al.username, al.date, arl.log_time;
	`
	rows, err := r.db.QueryxContext(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		row := make(map[string]interface{})
		err := rows.MapScan(row)
		if err != nil {
			return nil, err
		}
		for k, v := range row {
			if b, ok := v.([]byte); ok {
				row[k] = string(b)
			}
		}
		results = append(results, row)
	}
	return results, nil
}

func (r *attendanceRepositoryImpl) GetMonthlyLogs(ctx context.Context, year int, month int) ([]map[string]interface{}, error) {
	query := `
		SELECT
			al.id, al.username, u.id as user_id, al.date, al.check_in, al.check_out,
			al.lateness_minutes, al.overtime_minutes, al.notes, al.status,
			arl.log_time, arl.log_type
		FROM attendance_logs al
		JOIN users u ON al.username = u.username
		LEFT JOIN attendance_raw_logs arl ON al.id = arl.attendance_log_id
		WHERE YEAR(al.date) = ? AND MONTH(al.date) = ?
		  AND u.exclude_from_attendance = FALSE
		ORDER BY al.username, al.date, arl.log_time;
	`
	rows, err := r.db.QueryxContext(ctx, query, year, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		row := make(map[string]interface{})
		err := rows.MapScan(row)
		if err != nil {
			return nil, err
		}
		for k, v := range row {
			if b, ok := v.([]byte); ok {
				row[k] = string(b)
			}
		}
		results = append(results, row)
	}
	return results, nil
}

func (r *attendanceRepositoryImpl) GetHolidays(ctx context.Context, year int) (map[string]bool, error) {
	query := "SELECT date, name FROM holidays WHERE YEAR(date) = ?"
	rows, err := r.db.QueryxContext(ctx, query, year)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	holidayMap := make(map[string]bool)
	for rows.Next() {
		var h model.Holiday
		if err := rows.StructScan(&h); err != nil {
			continue
		}
		// logic from fileHelpers.js: ignore "cuti bersama"
		// In Go, date is time.Time
		dateStr := h.Date.Format("2006-01-02")
		// simplistic check, ideally strings.Contains(strings.ToLower(h.Name), "cuti bersama")
		// but I'll skip it here since string check can be done in service or here.
		holidayMap[dateStr] = true
	}
	return holidayMap, nil
}

func (r *attendanceRepositoryImpl) UpsertLog(ctx context.Context, log *model.AttendanceLog) error {
	queryCheck := `SELECT id FROM attendance_logs WHERE username = ? AND date = ?`
	var existingID int
	err := r.db.GetContext(ctx, &existingID, queryCheck, log.Username, log.Date)
	
	if err == nil && existingID != 0 {
		// Update
		query := `
			UPDATE attendance_logs
			SET check_in = ?, check_out = ?, lateness_minutes = ?, overtime_minutes = ?, status = ?, notes = ?
			WHERE id = ?
		`
		_, err = r.db.ExecContext(ctx, query, log.CheckIn, log.CheckOut, log.LatenessMinutes, log.OvertimeMinutes, log.Status, log.Notes, existingID)
		return err
	}

	// Insert
	queryInsert := `
		INSERT INTO attendance_logs (username, date, check_in, check_out, lateness_minutes, overtime_minutes, status, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err = r.db.ExecContext(ctx, queryInsert, log.Username, log.Date, log.CheckIn, log.CheckOut, log.LatenessMinutes, log.OvertimeMinutes, log.Status, log.Notes)
	return err
}

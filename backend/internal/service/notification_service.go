package service

import (
	"context"
	"log"

	"github.com/dps-wmhris/backend/internal/database"
	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/repository"
	"github.com/jmoiron/sqlx"
)

// NotificationService handles notification business logic.
type NotificationService interface {
	FetchRecentPending(ctx context.Context, userID int, limit int) ([]dto.NotificationResponse, error)
	FetchAll(ctx context.Context, userID int, filterType string) ([]dto.NotificationResponse, error)
	MarkNotificationAsDone(ctx context.Context, notificationID int, userID int) error
	MarkAllNotificationsAsDone(ctx context.Context, userID int) error
	ClaimNotification(ctx context.Context, notificationID int, userID int) (bool, error)
	FetchPreferences(ctx context.Context, userID int) ([]dto.NotificationPreference, error)
	UpdatePreferences(ctx context.Context, userID int, preferences []dto.NotificationPreference) error
	NotifyUsers(ctx context.Context, userIDs []int, notifType, title, message string, actionPayload interface{}, isDone bool) error
	NotifyUsersByPermission(ctx context.Context, permissionName, notifType, title, message string, actionPayload interface{}, excludeUserID *int, isDone bool) error
}

type notificationServiceImpl struct {
	db               *sqlx.DB
	notificationRepo repository.NotificationRepository
}

// NewNotificationService creates a new NotificationService.
func NewNotificationService(db *sqlx.DB, notificationRepo repository.NotificationRepository) NotificationService {
	return &notificationServiceImpl{db: db, notificationRepo: notificationRepo}
}

// FetchRecentPending returns recent pending notifications for a user.
func (s *notificationServiceImpl) FetchRecentPending(ctx context.Context, userID int, limit int) ([]dto.NotificationResponse, error) {
	if limit <= 0 {
		limit = 5
	}
	return s.notificationRepo.GetRecentPending(ctx, userID, limit)
}

// FetchAll returns all notifications for a user, optionally filtered by type.
func (s *notificationServiceImpl) FetchAll(ctx context.Context, userID int, filterType string) ([]dto.NotificationResponse, error) {
	return s.notificationRepo.GetAll(ctx, userID, filterType)
}

// MarkNotificationAsDone marks a single notification as done within a transaction.
func (s *notificationServiceImpl) MarkNotificationAsDone(ctx context.Context, notificationID int, userID int) error {
	return database.WithTransaction(s.db, ctx, func(tx *sqlx.Tx) error {
		_, err := s.notificationRepo.MarkAsDone(ctx, tx, notificationID, userID)
		return err
	})
}

// MarkAllNotificationsAsDone marks all pending notifications as done within a transaction.
func (s *notificationServiceImpl) MarkAllNotificationsAsDone(ctx context.Context, userID int) error {
	return database.WithTransaction(s.db, ctx, func(tx *sqlx.Tx) error {
		_, err := s.notificationRepo.MarkAllAsDone(ctx, tx, userID)
		return err
	})
}

// ClaimNotification claims a shared-task notification for the user.
func (s *notificationServiceImpl) ClaimNotification(ctx context.Context, notificationID int, userID int) (bool, error) {
	var affected int
	err := database.WithTransaction(s.db, ctx, func(tx *sqlx.Tx) error {
		var txErr error
		affected, txErr = s.notificationRepo.ClaimTask(ctx, tx, notificationID, userID)
		return txErr
	})
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}

// FetchPreferences returns notification preferences for a user, filling defaults.
func (s *notificationServiceImpl) FetchPreferences(ctx context.Context, userID int) ([]dto.NotificationPreference, error) {
	prefs, err := s.notificationRepo.GetPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}

	defaultTypes := []string{"WMS", "HRIS", "SYSTEM"}
	result := make([]dto.NotificationPreference, 0, len(defaultTypes))
	for _, t := range defaultTypes {
		found := false
		for _, p := range prefs {
			if p.Type == t {
				result = append(result, p)
				found = true
				break
			}
		}
		if !found {
			result = append(result, dto.NotificationPreference{Type: t, IsEnabled: true})
		}
	}

	return result, nil
}

// UpdatePreferences updates notification preferences for a user within a transaction.
func (s *notificationServiceImpl) UpdatePreferences(ctx context.Context, userID int, preferences []dto.NotificationPreference) error {
	return database.WithTransaction(s.db, ctx, func(tx *sqlx.Tx) error {
		for _, pref := range preferences {
			if err := s.notificationRepo.UpsertPreference(ctx, tx, userID, pref.Type, pref.IsEnabled); err != nil {
				return err
			}
		}
		return nil
	})
}

// NotifyUsers creates a personal notification for each user in the list.
// Firebase signal is skipped in the Go migration (fire-and-forget was used in Node.js).
func (s *notificationServiceImpl) NotifyUsers(ctx context.Context, userIDs []int, notifType, title, message string, actionPayload interface{}, isDone bool) error {
	if len(userIDs) == 0 {
		return nil
	}
	for _, uid := range userIDs {
		prefs, err := s.notificationRepo.GetPreferences(ctx, uid)
		if err != nil {
			log.Printf("[NOTIFICATION] Error fetching prefs for user %d: %v", uid, err)
			continue
		}

		isEnabled := true
		for _, p := range prefs {
			if p.Type == notifType {
				isEnabled = p.IsEnabled
				break
			}
		}

		if isEnabled {
			uidCopy := uid
			_, err := s.notificationRepo.CreateNotification(ctx, s.db, dto.CreateNotificationPayload{
				UserID:        &uidCopy,
				Type:          notifType,
				Title:         title,
				Message:       message,
				ActionPayload: actionPayload,
				IsDone:        isDone,
			})
			if err != nil {
				log.Printf("[NOTIFICATION] Error creating notification for user %d: %v", uid, err)
			}
		}
	}
	return nil
}

// NotifyUsersByPermission creates a single shared-task notification visible to all users with the given permission.
func (s *notificationServiceImpl) NotifyUsersByPermission(ctx context.Context, permissionName, notifType, title, message string, actionPayload interface{}, excludeUserID *int, isDone bool) error {
	_, err := s.notificationRepo.CreateNotification(ctx, s.db, dto.CreateNotificationPayload{
		UserID:           nil,
		Type:             notifType,
		Title:            title,
		Message:          message,
		ActionPayload:    actionPayload,
		IsDone:           isDone,
		TargetPermission: &permissionName,
		ExcludeUserID:    excludeUserID,
	})
	if err != nil {
		log.Printf("[NOTIFICATION] Error creating shared task: %v", err)
	}
	return err
}

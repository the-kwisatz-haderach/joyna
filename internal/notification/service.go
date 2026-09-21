package notification

import "context"

type repository interface {
	Create(ctx context.Context, userID string, notifType Type, payload map[string]any) error
	ListByUser(ctx context.Context, userID string) ([]Notification, error)
	MarkAllAsRead(ctx context.Context, userID string) error
	CountUnread(ctx context.Context, userID string) (int, error)
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

// Notify records a new notification for userID. Other domains raise
// notifications through this method (satisfying their own unexported
// `notifier` interface) without importing this package.
func (s *Service) Notify(ctx context.Context, userID string, notifType Type, payload map[string]any) error {
	return s.repo.Create(ctx, userID, notifType, payload)
}

// ListForUser returns userID's notifications with IsRead reflecting each
// one's state as of just before this call, then marks them all read —
// visiting the notifications screen is what flips them, so the caller still
// sees what was unread on this particular visit.
func (s *Service) ListForUser(ctx context.Context, userID string) ([]Notification, error) {
	notifications, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if err := s.repo.MarkAllAsRead(ctx, userID); err != nil {
		return nil, err
	}
	return notifications, nil
}

func (s *Service) UnreadCount(ctx context.Context, userID string) (int, error) {
	return s.repo.CountUnread(ctx, userID)
}

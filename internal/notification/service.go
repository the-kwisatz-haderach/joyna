package notification

import "context"

// PageSize is the fixed number of notifications returned per page by
// ListForUser.
const PageSize = 30

type repository interface {
	Create(ctx context.Context, userID string, notifType Type, payload map[string]any) error
	ListByUser(ctx context.Context, userID string, limit, offset int) ([]Notification, error)
	CountByUser(ctx context.Context, userID string) (int, error)
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

// ListForUser returns page (1-indexed) of userID's notifications, PageSize
// per page, alongside the total notification count, with IsRead reflecting
// each one's state as of just before this call — then marks them all read.
// Visiting the notifications screen is what flips them, so the caller still
// sees what was unread on this particular visit, regardless of which page it
// requested.
func (s *Service) ListForUser(ctx context.Context, userID string, page int) ([]Notification, int, error) {
	if page < 1 {
		page = 1
	}

	total, err := s.repo.CountByUser(ctx, userID)
	if err != nil {
		return nil, 0, err
	}

	notifications, err := s.repo.ListByUser(ctx, userID, PageSize, (page-1)*PageSize)
	if err != nil {
		return nil, 0, err
	}
	if err := s.repo.MarkAllAsRead(ctx, userID); err != nil {
		return nil, 0, err
	}
	return notifications, total, nil
}

func (s *Service) UnreadCount(ctx context.Context, userID string) (int, error) {
	return s.repo.CountUnread(ctx, userID)
}

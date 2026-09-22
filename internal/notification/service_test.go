package notification

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type fakeRepository struct {
	createFunc        func(ctx context.Context, userID string, notifType Type, payload map[string]any) error
	listByUserFunc    func(ctx context.Context, userID string, limit, offset int) ([]Notification, error)
	countByUserFunc   func(ctx context.Context, userID string) (int, error)
	markAllAsReadFunc func(ctx context.Context, userID string) error
	countUnreadFunc   func(ctx context.Context, userID string) (int, error)
}

func (f *fakeRepository) Create(ctx context.Context, userID string, notifType Type, payload map[string]any) error {
	return f.createFunc(ctx, userID, notifType, payload)
}

func (f *fakeRepository) ListByUser(ctx context.Context, userID string, limit, offset int) ([]Notification, error) {
	return f.listByUserFunc(ctx, userID, limit, offset)
}

func (f *fakeRepository) CountByUser(ctx context.Context, userID string) (int, error) {
	return f.countByUserFunc(ctx, userID)
}

func (f *fakeRepository) MarkAllAsRead(ctx context.Context, userID string) error {
	return f.markAllAsReadFunc(ctx, userID)
}

func (f *fakeRepository) CountUnread(ctx context.Context, userID string) (int, error) {
	return f.countUnreadFunc(ctx, userID)
}

func TestNotify(t *testing.T) {
	var created bool
	repo := &fakeRepository{
		createFunc: func(ctx context.Context, userID string, notifType Type, payload map[string]any) error {
			created = true
			require.Equal(t, "user-id", userID)
			require.Equal(t, TypeEventInvite, notifType)
			require.Equal(t, map[string]any{"eventId": "event-id"}, payload)
			return nil
		},
	}
	service := NewService(repo)
	err := service.Notify(context.Background(), "user-id", TypeEventInvite, map[string]any{"eventId": "event-id"})
	require.NoError(t, err)
	require.True(t, created)
}

func TestListForUser_MarksAsReadAfterFetching(t *testing.T) {
	notifications := []Notification{{ID: "n1"}}
	var order []string
	repo := &fakeRepository{
		countByUserFunc: func(ctx context.Context, userID string) (int, error) {
			return 1, nil
		},
		listByUserFunc: func(ctx context.Context, userID string, limit, offset int) ([]Notification, error) {
			order = append(order, "list")
			require.Equal(t, "user-id", userID)
			require.Equal(t, PageSize, limit)
			require.Equal(t, 0, offset)
			return notifications, nil
		},
		markAllAsReadFunc: func(ctx context.Context, userID string) error {
			order = append(order, "mark")
			require.Equal(t, "user-id", userID)
			return nil
		},
	}
	service := NewService(repo)
	result, total, err := service.ListForUser(context.Background(), "user-id", 1)
	require.NoError(t, err)
	require.Equal(t, notifications, result)
	require.Equal(t, 1, total)
	require.Equal(t, []string{"list", "mark"}, order)
}

func TestListForUser_UsesPageOffset(t *testing.T) {
	repo := &fakeRepository{
		countByUserFunc: func(ctx context.Context, userID string) (int, error) {
			return 90, nil
		},
		listByUserFunc: func(ctx context.Context, userID string, limit, offset int) ([]Notification, error) {
			require.Equal(t, PageSize, limit)
			require.Equal(t, 60, offset)
			return []Notification{}, nil
		},
		markAllAsReadFunc: func(ctx context.Context, userID string) error {
			return nil
		},
	}
	service := NewService(repo)
	_, total, err := service.ListForUser(context.Background(), "user-id", 3)
	require.NoError(t, err)
	require.Equal(t, 90, total)
}

func TestListForUser_ClampsPageBelowOne(t *testing.T) {
	repo := &fakeRepository{
		countByUserFunc: func(ctx context.Context, userID string) (int, error) {
			return 0, nil
		},
		listByUserFunc: func(ctx context.Context, userID string, limit, offset int) ([]Notification, error) {
			require.Equal(t, 0, offset)
			return []Notification{}, nil
		},
		markAllAsReadFunc: func(ctx context.Context, userID string) error {
			return nil
		},
	}
	service := NewService(repo)
	_, _, err := service.ListForUser(context.Background(), "user-id", 0)
	require.NoError(t, err)
}

func TestListForUser_CountError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepository{
		countByUserFunc: func(ctx context.Context, userID string) (int, error) {
			return 0, repoErr
		},
	}
	service := NewService(repo)
	_, _, err := service.ListForUser(context.Background(), "user-id", 1)
	require.ErrorIs(t, err, repoErr)
}

func TestListForUser_ListError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepository{
		countByUserFunc: func(ctx context.Context, userID string) (int, error) {
			return 0, nil
		},
		listByUserFunc: func(ctx context.Context, userID string, limit, offset int) ([]Notification, error) {
			return nil, repoErr
		},
	}
	service := NewService(repo)
	_, _, err := service.ListForUser(context.Background(), "user-id", 1)
	require.ErrorIs(t, err, repoErr)
}

func TestListForUser_MarkAsReadError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepository{
		countByUserFunc: func(ctx context.Context, userID string) (int, error) {
			return 0, nil
		},
		listByUserFunc: func(ctx context.Context, userID string, limit, offset int) ([]Notification, error) {
			return []Notification{}, nil
		},
		markAllAsReadFunc: func(ctx context.Context, userID string) error {
			return repoErr
		},
	}
	service := NewService(repo)
	_, _, err := service.ListForUser(context.Background(), "user-id", 1)
	require.ErrorIs(t, err, repoErr)
}

func TestUnreadCount(t *testing.T) {
	repo := &fakeRepository{
		countUnreadFunc: func(ctx context.Context, userID string) (int, error) {
			require.Equal(t, "user-id", userID)
			return 3, nil
		},
	}
	service := NewService(repo)
	count, err := service.UnreadCount(context.Background(), "user-id")
	require.NoError(t, err)
	require.Equal(t, 3, count)
}

package notification

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type fakeRepository struct {
	createFunc        func(ctx context.Context, userID string, notifType Type, payload map[string]any) error
	listByUserFunc    func(ctx context.Context, userID string) ([]Notification, error)
	markAllAsReadFunc func(ctx context.Context, userID string) error
	countUnreadFunc   func(ctx context.Context, userID string) (int, error)
}

func (f *fakeRepository) Create(ctx context.Context, userID string, notifType Type, payload map[string]any) error {
	return f.createFunc(ctx, userID, notifType, payload)
}

func (f *fakeRepository) ListByUser(ctx context.Context, userID string) ([]Notification, error) {
	return f.listByUserFunc(ctx, userID)
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
		listByUserFunc: func(ctx context.Context, userID string) ([]Notification, error) {
			order = append(order, "list")
			require.Equal(t, "user-id", userID)
			return notifications, nil
		},
		markAllAsReadFunc: func(ctx context.Context, userID string) error {
			order = append(order, "mark")
			require.Equal(t, "user-id", userID)
			return nil
		},
	}
	service := NewService(repo)
	result, err := service.ListForUser(context.Background(), "user-id")
	require.NoError(t, err)
	require.Equal(t, notifications, result)
	require.Equal(t, []string{"list", "mark"}, order)
}

func TestListForUser_ListError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepository{
		listByUserFunc: func(ctx context.Context, userID string) ([]Notification, error) {
			return nil, repoErr
		},
	}
	service := NewService(repo)
	_, err := service.ListForUser(context.Background(), "user-id")
	require.ErrorIs(t, err, repoErr)
}

func TestListForUser_MarkAsReadError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepository{
		listByUserFunc: func(ctx context.Context, userID string) ([]Notification, error) {
			return []Notification{}, nil
		},
		markAllAsReadFunc: func(ctx context.Context, userID string) error {
			return repoErr
		},
	}
	service := NewService(repo)
	_, err := service.ListForUser(context.Background(), "user-id")
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

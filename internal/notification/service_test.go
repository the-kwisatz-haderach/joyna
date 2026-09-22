package notification

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/push"
)

type fakeRepository struct {
	createFunc                      func(ctx context.Context, userID string, notifType Type, payload map[string]any) error
	listByUserFunc                  func(ctx context.Context, userID string, limit, offset int) ([]Notification, error)
	countByUserFunc                 func(ctx context.Context, userID string) (int, error)
	markAllAsReadFunc               func(ctx context.Context, userID string) error
	countUnreadFunc                 func(ctx context.Context, userID string) (int, error)
	createOrRefreshPushSubFunc      func(ctx context.Context, userID, endpoint, p256dh, auth string) (PushSubscription, error)
	listPushSubscriptionsByUserFunc func(ctx context.Context, userID string) ([]PushSubscription, error)
	deletePushSubscriptionFunc      func(ctx context.Context, userID, endpoint string) error
	deletePushSubscriptionByIDFunc  func(ctx context.Context, id string) error
	notificationContextFunc         func(ctx context.Context, eventID, actorID string) (string, string, error)
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

func (f *fakeRepository) CreateOrRefreshPushSubscription(ctx context.Context, userID, endpoint, p256dh, auth string) (PushSubscription, error) {
	return f.createOrRefreshPushSubFunc(ctx, userID, endpoint, p256dh, auth)
}

func (f *fakeRepository) ListPushSubscriptionsByUser(ctx context.Context, userID string) ([]PushSubscription, error) {
	if f.listPushSubscriptionsByUserFunc == nil {
		return nil, nil
	}
	return f.listPushSubscriptionsByUserFunc(ctx, userID)
}

func (f *fakeRepository) DeletePushSubscription(ctx context.Context, userID, endpoint string) error {
	return f.deletePushSubscriptionFunc(ctx, userID, endpoint)
}

func (f *fakeRepository) DeletePushSubscriptionByID(ctx context.Context, id string) error {
	return f.deletePushSubscriptionByIDFunc(ctx, id)
}

func (f *fakeRepository) NotificationContext(ctx context.Context, eventID, actorID string) (string, string, error) {
	if f.notificationContextFunc == nil {
		return "", "", nil
	}
	return f.notificationContextFunc(ctx, eventID, actorID)
}

type fakePusher struct {
	sendFunc func(ctx context.Context, endpoint, p256dhKey, authKey, title, body, url string) error
}

func (f *fakePusher) Send(ctx context.Context, endpoint, p256dhKey, authKey, title, body, url string) error {
	return f.sendFunc(ctx, endpoint, p256dhKey, authKey, title, body, url)
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
	service := NewService(repo, nil, "")
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
	service := NewService(repo, nil, "")
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
	service := NewService(repo, nil, "")
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
	service := NewService(repo, nil, "")
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
	service := NewService(repo, nil, "")
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
	service := NewService(repo, nil, "")
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
	service := NewService(repo, nil, "")
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
	service := NewService(repo, nil, "")
	count, err := service.UnreadCount(context.Background(), "user-id")
	require.NoError(t, err)
	require.Equal(t, 3, count)
}

func TestNotify_SendsPushToEverySubscription(t *testing.T) {
	subs := []PushSubscription{
		{ID: "sub-1", Endpoint: "endpoint-1", P256dh: "p256dh-1", Auth: "auth-1"},
		{ID: "sub-2", Endpoint: "endpoint-2", P256dh: "p256dh-2", Auth: "auth-2"},
	}
	var sentTo []string
	repo := &fakeRepository{
		createFunc: func(ctx context.Context, userID string, notifType Type, payload map[string]any) error {
			return nil
		},
		listPushSubscriptionsByUserFunc: func(ctx context.Context, userID string) ([]PushSubscription, error) {
			require.Equal(t, "user-id", userID)
			return subs, nil
		},
		notificationContextFunc: func(ctx context.Context, eventID, actorID string) (string, string, error) {
			return "Summer Party", "Ada", nil
		},
	}
	pusher := &fakePusher{
		sendFunc: func(ctx context.Context, endpoint, p256dhKey, authKey, title, body, url string) error {
			sentTo = append(sentTo, endpoint)
			require.NotEmpty(t, title)
			require.Contains(t, body, "Ada")
			require.Contains(t, body, "Summer Party")
			require.Equal(t, "/events/event-id", url)
			return nil
		},
	}
	service := NewService(repo, pusher, "")
	err := service.Notify(context.Background(), "user-id", TypeEventInvite, map[string]any{"eventId": "event-id", "actorId": "actor-id"})
	require.NoError(t, err)
	require.ElementsMatch(t, []string{"endpoint-1", "endpoint-2"}, sentTo)
}

func TestNotify_DeletesExpiredSubscription(t *testing.T) {
	subs := []PushSubscription{{ID: "sub-1", Endpoint: "endpoint-1"}}
	var deletedID string
	repo := &fakeRepository{
		createFunc: func(ctx context.Context, userID string, notifType Type, payload map[string]any) error {
			return nil
		},
		listPushSubscriptionsByUserFunc: func(ctx context.Context, userID string) ([]PushSubscription, error) {
			return subs, nil
		},
		deletePushSubscriptionByIDFunc: func(ctx context.Context, id string) error {
			deletedID = id
			return nil
		},
	}
	pusher := &fakePusher{
		sendFunc: func(ctx context.Context, endpoint, p256dhKey, authKey, title, body, url string) error {
			return push.ErrSubscriptionExpired
		},
	}
	service := NewService(repo, pusher, "")
	err := service.Notify(context.Background(), "user-id", TypeEventInvite, map[string]any{"eventId": "event-id"})
	require.NoError(t, err)
	require.Equal(t, "sub-1", deletedID)
}

func TestNotify_PushErrorDoesNotFailNotify(t *testing.T) {
	repo := &fakeRepository{
		createFunc: func(ctx context.Context, userID string, notifType Type, payload map[string]any) error {
			return nil
		},
		listPushSubscriptionsByUserFunc: func(ctx context.Context, userID string) ([]PushSubscription, error) {
			return []PushSubscription{{ID: "sub-1", Endpoint: "endpoint-1"}}, nil
		},
	}
	pusher := &fakePusher{
		sendFunc: func(ctx context.Context, endpoint, p256dhKey, authKey, title, body, url string) error {
			return errors.New("push service unavailable")
		},
	}
	service := NewService(repo, pusher, "")
	err := service.Notify(context.Background(), "user-id", TypeEventInvite, map[string]any{"eventId": "event-id"})
	require.NoError(t, err)
}

func TestNotify_NoPusherConfigured(t *testing.T) {
	repo := &fakeRepository{
		createFunc: func(ctx context.Context, userID string, notifType Type, payload map[string]any) error {
			return nil
		},
	}
	service := NewService(repo, nil, "")
	err := service.Notify(context.Background(), "user-id", TypeEventInvite, map[string]any{"eventId": "event-id"})
	require.NoError(t, err)
}

func TestSubscribeToPush_ValidatesPayload(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo, nil, "")
	_, err := service.SubscribeToPush(context.Background(), "user-id", SubscribeToPushPayload{})
	require.ErrorIs(t, err, ErrInvalidPushSubscription)
}

func TestSubscribeToPush_Upserts(t *testing.T) {
	repo := &fakeRepository{
		createOrRefreshPushSubFunc: func(ctx context.Context, userID, endpoint, p256dh, auth string) (PushSubscription, error) {
			require.Equal(t, "user-id", userID)
			require.Equal(t, "endpoint-1", endpoint)
			return PushSubscription{ID: "sub-1", UserID: userID, Endpoint: endpoint}, nil
		},
	}
	service := NewService(repo, nil, "")
	sub, err := service.SubscribeToPush(context.Background(), "user-id", SubscribeToPushPayload{Endpoint: "endpoint-1", P256dh: "p", Auth: "a"})
	require.NoError(t, err)
	require.Equal(t, "sub-1", sub.ID)
}

func TestUnsubscribeFromPush(t *testing.T) {
	repo := &fakeRepository{
		deletePushSubscriptionFunc: func(ctx context.Context, userID, endpoint string) error {
			require.Equal(t, "user-id", userID)
			require.Equal(t, "endpoint-1", endpoint)
			return nil
		},
	}
	service := NewService(repo, nil, "")
	err := service.UnsubscribeFromPush(context.Background(), "user-id", UnsubscribeFromPushPayload{Endpoint: "endpoint-1"})
	require.NoError(t, err)
}

func TestVAPIDPublicKey(t *testing.T) {
	service := NewService(&fakeRepository{}, nil, "test-public-key")
	require.Equal(t, "test-public-key", service.VAPIDPublicKey())
}

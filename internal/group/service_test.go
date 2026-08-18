package group

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type fakeRepository struct {
	createGroupFunc func(ctx context.Context, group CreateGroupPayload, ownerID string) (Group, error)
	updateGroupFunc func(ctx context.Context, groupUpdate UpdateGroupPayload, groupID, ownerID string) (Group, error)
	deleteGroupFunc func(ctx context.Context, groupID, ownerID string) error
}

func (f *fakeRepository) CreateGroup(ctx context.Context, group CreateGroupPayload, ownerID string) (Group, error) {
	return f.createGroupFunc(ctx, group, ownerID)
}

func (f *fakeRepository) UpdateGroup(ctx context.Context, groupUpdate UpdateGroupPayload, groupID, ownerID string) (Group, error) {
	return f.updateGroupFunc(ctx, groupUpdate, groupID, ownerID)
}

func (f *fakeRepository) DeleteGroup(ctx context.Context, groupID, ownerID string) error {
	return f.deleteGroupFunc(ctx, groupID, ownerID)
}

func TestCreateGroup(t *testing.T) {
	createdGroup := Group{ID: "group-id", Name: "friends"}
	var repo = &fakeRepository{
		createGroupFunc: func(ctx context.Context, group CreateGroupPayload, ownerID string) (Group, error) {
			require.Equal(t, "owner-id", ownerID)
			return createdGroup, nil
		},
	}
	service := NewService(repo)
	group, err := service.CreateGroup(context.Background(), CreateGroupPayload{Name: "friends"}, "owner-id")
	require.NoError(t, err)
	require.Equal(t, createdGroup, group)
}

func TestCreateGroup_RepositoryError(t *testing.T) {
	repoErr := errors.New("boom")
	var repo = &fakeRepository{
		createGroupFunc: func(ctx context.Context, group CreateGroupPayload, ownerID string) (Group, error) {
			return Group{}, repoErr
		},
	}
	service := NewService(repo)
	_, err := service.CreateGroup(context.Background(), CreateGroupPayload{Name: "friends"}, "owner-id")
	require.ErrorIs(t, err, repoErr)
}

func TestUpdateGroup(t *testing.T) {
	updatedGroup := Group{ID: "group-id", Name: "renamed"}
	var repo = &fakeRepository{
		updateGroupFunc: func(ctx context.Context, groupUpdate UpdateGroupPayload, groupID, ownerID string) (Group, error) {
			require.Equal(t, "group-id", groupID)
			require.Equal(t, "owner-id", ownerID)
			return updatedGroup, nil
		},
	}
	service := NewService(repo)
	group, err := service.UpdateGroup(context.Background(), UpdateGroupPayload{}, "group-id", "owner-id")
	require.NoError(t, err)
	require.Equal(t, updatedGroup, group)
}

func TestUpdateGroup_NotFound(t *testing.T) {
	var repo = &fakeRepository{
		updateGroupFunc: func(ctx context.Context, groupUpdate UpdateGroupPayload, groupID, ownerID string) (Group, error) {
			return Group{}, ErrGroupNotFound
		},
	}
	service := NewService(repo)
	_, err := service.UpdateGroup(context.Background(), UpdateGroupPayload{}, "group-id", "owner-id")
	require.ErrorIs(t, err, ErrGroupNotFound)
}

func TestDeleteGroup(t *testing.T) {
	var called bool
	var repo = &fakeRepository{
		deleteGroupFunc: func(ctx context.Context, groupID, ownerID string) error {
			called = true
			require.Equal(t, "group-id", groupID)
			require.Equal(t, "owner-id", ownerID)
			return nil
		},
	}
	service := NewService(repo)
	err := service.DeleteGroup(context.Background(), "group-id", "owner-id")
	require.NoError(t, err)
	require.True(t, called)
}

func TestDeleteGroup_NotFound(t *testing.T) {
	var repo = &fakeRepository{
		deleteGroupFunc: func(ctx context.Context, groupID, ownerID string) error {
			return ErrGroupNotFound
		},
	}
	service := NewService(repo)
	err := service.DeleteGroup(context.Background(), "group-id", "owner-id")
	require.ErrorIs(t, err, ErrGroupNotFound)
}

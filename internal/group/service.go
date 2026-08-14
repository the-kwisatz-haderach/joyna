package group

import (
	"context"
	"errors"
)

var ErrUnauthorizedGroupUpdate = errors.New("user must be owner of group to update it")

type repository interface {
	CreateGroup(ctx context.Context, group CreateGroupPayload, ownerID string) (Group, error)
	GetGroup(ctx context.Context, groupID string) (Group, error)
	UpdateGroup(ctx context.Context, groupUpdate UpdateGroupPayload, groupID, ownerID string) (Group, error)
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateGroup(ctx context.Context, group CreateGroupPayload, ownerID string) (Group, error) {
	return s.repo.CreateGroup(ctx, group, ownerID)
}

func (s *Service) UpdateGroup(ctx context.Context, groupUpdate UpdateGroupPayload, groupID, ownerID string) (Group, error) {
	existing, err := s.repo.GetGroup(ctx, groupID)
	if err != nil {
		return Group{}, err
	}
	if existing.OwnerID != ownerID {
		return Group{}, ErrUnauthorizedGroupUpdate
	}
	return s.repo.UpdateGroup(ctx, groupUpdate, groupID, ownerID)
}

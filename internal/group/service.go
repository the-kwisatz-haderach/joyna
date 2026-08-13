package group

import (
	"context"
	"errors"
	"strings"
)

var ErrEmptyGroupName = errors.New("group name must not be empty")

type repository interface {
	UpdateGroup(ctx context.Context, groupUpdate GroupUpdate, groupID, ownerID string) (Group, error)
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) UpdateGroup(ctx context.Context, groupUpdate GroupUpdate, groupID, ownerID string) (Group, error) {
	if groupUpdate.Name != nil && strings.TrimSpace(*groupUpdate.Name) == "" {
		return Group{}, ErrEmptyGroupName
	}
	return s.repo.UpdateGroup(ctx, groupUpdate, groupID, ownerID)
}

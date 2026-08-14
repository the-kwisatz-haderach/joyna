package group

import (
	"context"
)

type repository interface {
	CreateGroup(ctx context.Context, group CreateGroupPayload, ownerID string) (Group, error)
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

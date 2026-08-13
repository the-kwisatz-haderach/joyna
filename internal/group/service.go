package group

import "context"

type repository interface {
	DeleteGroup(ctx context.Context, groupID, ownerID string) error
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) DeleteGroup(ctx context.Context, groupID, ownerID string) error {
	return s.repo.DeleteGroup(ctx, groupID, ownerID)
}

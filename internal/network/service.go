package network

import "context"

type repository interface {
	ListConnections(ctx context.Context, ownerID string) ([]Connection, error)
	ListPotentialConnections(ctx context.Context, ownerID string) ([]PotentialConnection, error)
	CreateConnection(ctx context.Context, payload CreateConnectionPayload, ownerID string) (Connection, error)
	UpdateConnection(ctx context.Context, payload UpdateConnectionPayload, contactID, ownerID string) (Connection, error)
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListConnections(ctx context.Context, ownerID string) ([]Connection, error) {
	return s.repo.ListConnections(ctx, ownerID)
}

func (s *Service) ListPotentialConnections(ctx context.Context, ownerID string) ([]PotentialConnection, error) {
	return s.repo.ListPotentialConnections(ctx, ownerID)
}

func (s *Service) CreateConnection(ctx context.Context, payload CreateConnectionPayload, ownerID string) (Connection, error) {
	if payload.ContactID == ownerID {
		return Connection{}, ErrSelfConnection
	}
	return s.repo.CreateConnection(ctx, payload, ownerID)
}

func (s *Service) UpdateConnection(ctx context.Context, payload UpdateConnectionPayload, contactID, ownerID string) (Connection, error) {
	return s.repo.UpdateConnection(ctx, payload, contactID, ownerID)
}

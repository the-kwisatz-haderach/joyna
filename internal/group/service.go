package group

import (
	"context"
	"errors"
	"strings"
)

var ErrEmptyGroupName = errors.New("group name must not be empty")

type repository interface {
	CreateGroup(ctx context.Context, group Group) (Group, error)
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateGroup(ctx context.Context, group Group) (Group, error) {
	if strings.TrimSpace(group.Name) == "" {
		return Group{}, ErrEmptyGroupName
	}
	return s.repo.CreateGroup(ctx, group)
}

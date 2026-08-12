package event

import (
	"context"
	"errors"
	"time"
)

var (
	ErrPastEventDate       = errors.New("event date must be in the future")
	ErrInvalidRsvpDeadline = errors.New("rsvp deadline must be on or before the event date")
)

type repository interface {
	CreateEvent(ctx context.Context, event Event) (Event, error)
	UpdateEvent(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error)
	DeleteEvent(ctx context.Context, eventId, ownerID string) error
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateEvent(ctx context.Context, event Event) (Event, error) {
	if !event.Date.After(time.Now()) {
		return Event{}, ErrPastEventDate
	}
	if event.RsvpDeadline != nil && event.RsvpDeadline.After(event.Date) {
		return Event{}, ErrInvalidRsvpDeadline
	}
	e, err := s.repo.CreateEvent(ctx, event)
	return e, err
}

func (s *Service) DeleteEvent(ctx context.Context, eventID, ownerID string) error {
	return s.repo.DeleteEvent(ctx, eventID, ownerID)
}

func (s *Service) UpdateEvent(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error) {
	return s.repo.UpdateEvent(ctx, eventUpdate, eventID, ownerID)
}

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
	DeleteEvent(ctx context.Context, eventID, ownerID string) error
	GetEventsByOwner(ctx context.Context, ownerID string, sortField EventSortField, order SortOrder) ([]Event, error)
	GetEvent(ctx context.Context, eventID, ownerID string) (Event, error)
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
	existing, err := s.repo.GetEvent(ctx, eventID, ownerID)
	if err != nil {
		return Event{}, err
	}

	date := existing.Date
	if eventUpdate.Date != nil {
		date = *eventUpdate.Date
	}
	rsvpDeadline := existing.RsvpDeadline
	if eventUpdate.RsvpDeadline != nil {
		rsvpDeadline = eventUpdate.RsvpDeadline
	}

	if !date.After(time.Now()) {
		return Event{}, ErrPastEventDate
	}
	if rsvpDeadline != nil && rsvpDeadline.After(date) {
		return Event{}, ErrInvalidRsvpDeadline
	}

	return s.repo.UpdateEvent(ctx, eventUpdate, eventID, ownerID)
}

func (s *Service) GetEvents(ctx context.Context, ownerID string, sortField EventSortField, order SortOrder) ([]Event, error) {
	return s.repo.GetEventsByOwner(ctx, ownerID, sortField, order)
}

package event

import (
	"context"
	"errors"
	"time"
)

var (
	ErrPastEventDate           = errors.New("event date must be in the future")
	ErrInvalidRsvpDeadline     = errors.New("rsvp deadline must be on or before the event date")
	ErrInviteNotAllowed        = errors.New("user not allowed to invite (additional) users to event")
	ErrUnauthorizedEventUpdate = errors.New("user must be owner of event to update it")
)

type repository interface {
	CreateEvent(ctx context.Context, payload CreateEventPayload, ownerID string) (Event, error)
	UpdateEvent(ctx context.Context, eventUpdate UpdateEventPayload, eventID, ownerID string) (Event, error)
	DeleteEvent(ctx context.Context, eventID, ownerID string) error
	GetEventsByOwner(ctx context.Context, ownerID string, sortField EventSortField, order SortOrder) ([]Event, error)
	GetEvent(ctx context.Context, eventID string) (Event, error)
	CreateEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error)
	ForwardEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error)
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateEvent(ctx context.Context, payload CreateEventPayload, ownerID string) (Event, error) {
	if !payload.Date.After(time.Now()) {
		return Event{}, ErrPastEventDate
	}
	if payload.RsvpDeadline != nil && payload.RsvpDeadline.After(payload.Date) {
		return Event{}, ErrInvalidRsvpDeadline
	}
	return s.repo.CreateEvent(ctx, payload, ownerID)
}

func (s *Service) DeleteEvent(ctx context.Context, eventID, ownerID string) error {
	return s.repo.DeleteEvent(ctx, eventID, ownerID)
}

func (s *Service) UpdateEvent(ctx context.Context, eventUpdate UpdateEventPayload, eventID, ownerID string) (Event, error) {
	existing, err := s.repo.GetEvent(ctx, eventID)
	if err != nil {
		return Event{}, err
	}
	if existing.OwnerId != ownerID {
		return Event{}, ErrUnauthorizedEventUpdate
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

func (s *Service) SendEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
	if payload.InvitedUserID == invitedBy {
		return EventInvite{}, ErrInviteNotAllowed
	}
	event, err := s.repo.GetEvent(ctx, payload.EventID)
	if err != nil {
		return EventInvite{}, err
	}

	if event.OwnerId == invitedBy {
		createdInvite, err := s.repo.CreateEventInvite(ctx, payload, invitedBy)
		// TODO: Create notification(s)
		return createdInvite, err
	}

	payload.SpreadAllowed = 0
	createdInvite, err := s.repo.ForwardEventInvite(ctx, payload, invitedBy)
	// TODO: Create notification(s)
	return createdInvite, err
}

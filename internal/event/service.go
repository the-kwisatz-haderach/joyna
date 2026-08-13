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
	CreateEvent(ctx context.Context, event Event) (Event, error)
	UpdateEvent(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error)
	DeleteEvent(ctx context.Context, eventID, ownerID string) error
	GetEventsByOwner(ctx context.Context, ownerID string, sortField EventSortField, order SortOrder) ([]Event, error)
	GetEvent(ctx context.Context, eventID string) (Event, error)
	CreateEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error)
	GetEventInviteByInvitedUser(ctx context.Context, eventID, invitedUserID string) (EventInvite, error)
	CountEventInvitesBySender(ctx context.Context, eventID, invitedBy string) (int, error)
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

func (s *Service) SendEventInvite(ctx context.Context, createEventInvitePayload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
	event, err := s.repo.GetEvent(ctx, createEventInvitePayload.EventID)
	if err != nil {
		return EventInvite{}, err
	}
	isInviteValid := event.OwnerId == invitedBy
	if !isInviteValid {
		invite, err := s.repo.GetEventInviteByInvitedUser(ctx, createEventInvitePayload.EventID, invitedBy)
		if errors.Is(err, ErrEventInviteNotFound) {
			return EventInvite{}, ErrInviteNotAllowed
		}
		if err != nil {
			return EventInvite{}, err
		}
		currentSpread, err := s.repo.CountEventInvitesBySender(ctx, createEventInvitePayload.EventID, invitedBy)
		if err != nil {
			return EventInvite{}, err
		}
		if invite.Status == InviteStateAccepted && currentSpread < invite.SpreadAllowed {
			isInviteValid = true
		}
	}
	if !isInviteValid {
		return EventInvite{}, ErrInviteNotAllowed
	}

	createdInvite, err := s.repo.CreateEventInvite(ctx, createEventInvitePayload, invitedBy)
	// TODO: Create notification(s)
	return createdInvite, err
}

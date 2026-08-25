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
	GetEventsByOwner(ctx context.Context, userID string, sortField EventSortField, order SortOrder, scope EventListScope) ([]Event, error)
	GetEvent(ctx context.Context, eventID string) (Event, error)
	GetEventInvite(ctx context.Context, eventID, userID string) (EventInvite, error)
	RespondToEventInvite(ctx context.Context, eventID, userID string, status EventInviteStatus) (EventInvite, error)
	ListEventAttendees(ctx context.Context, eventID string) ([]Attendee, error)
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

func (s *Service) GetEvents(ctx context.Context, userID string, sortField EventSortField, order SortOrder, scope EventListScope) ([]Event, error) {
	return s.repo.GetEventsByOwner(ctx, userID, sortField, order, scope)
}

// GetEventDetail returns an event along with the viewer's relationship to
// it. Only the owner or an invitee may view it; anyone else gets
// ErrEventNotFound so the endpoint doesn't leak whether the event exists.
func (s *Service) GetEventDetail(ctx context.Context, eventID, viewerID string) (EventView, error) {
	ev, err := s.repo.GetEvent(ctx, eventID)
	if err != nil {
		return EventView{}, err
	}
	if ev.OwnerId == viewerID {
		return EventView{Event: ev, IsOwner: true}, nil
	}

	invite, err := s.repo.GetEventInvite(ctx, eventID, viewerID)
	if err != nil {
		if errors.Is(err, ErrInviteNotFound) {
			return EventView{}, ErrEventNotFound
		}
		return EventView{}, err
	}

	status := invite.Status
	return EventView{Event: ev, ViewerInviteStatus: &status}, nil
}

func (s *Service) GetEventAttendees(ctx context.Context, eventID, viewerID string) ([]Attendee, error) {
	if _, err := s.GetEventDetail(ctx, eventID, viewerID); err != nil {
		return nil, err
	}
	return s.repo.ListEventAttendees(ctx, eventID)
}

func (s *Service) RespondToEventInvite(ctx context.Context, eventID, userID string, status EventInviteStatus) (EventInvite, error) {
	if status != InviteStateAccepted && status != InviteStateDeclined {
		return EventInvite{}, ErrInvalidInviteStatus
	}
	return s.repo.RespondToEventInvite(ctx, eventID, userID, status)
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

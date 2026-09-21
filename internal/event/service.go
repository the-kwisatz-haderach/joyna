package event

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"
)

var (
	ErrPastEventDate           = errors.New("event date must be in the future")
	ErrInvalidRsvpDeadline     = errors.New("rsvp deadline must be on or before the event date")
	ErrInviteNotAllowed        = errors.New("user not allowed to invite (additional) users to event")
	ErrUnauthorizedEventUpdate = errors.New("user must be owner of event to update it")
	ErrRemoveNotAllowed        = errors.New("user not allowed to remove this guest")
	ErrRsvpClosed              = errors.New("rsvp deadline has passed; only the host can update the guest list")
)

// Notification type strings. These must stay in sync with the equivalent
// notification.Type* constants — kept as plain strings (rather than an
// import of the notification package) so this package's notifier interface
// stays satisfied by notification.Service without a cross-domain import.
const (
	notificationEventInvite          = "event_invite"
	notificationEventUninvite        = "event_uninvite"
	notificationInviteResponse       = "invite_response"
	notificationEventUpdated         = "event_updated"
	notificationRsvpDeadlineReminder = "rsvp_deadline_reminder"
	notificationEventStartingToday   = "event_starting_today"
)

// rsvpClosed reports whether ev's RSVP deadline has passed, after which only
// the event's owner may change the guest list (invite, remove, or respond).
func rsvpClosed(ev Event) bool {
	return ev.RsvpDeadline != nil && ev.RsvpDeadline.Before(time.Now())
}

type repository interface {
	CreateEvent(ctx context.Context, payload CreateEventPayload, ownerID string) (Event, error)
	UpdateEvent(ctx context.Context, eventUpdate UpdateEventPayload, eventID, ownerID string) (Event, error)
	DeleteEvent(ctx context.Context, eventID, ownerID string) error
	GetEventsByOwner(ctx context.Context, userID string, sortField EventSortField, order SortOrder, scope EventListScope) ([]EventView, error)
	GetEvent(ctx context.Context, eventID string) (Event, error)
	GetEventInvite(ctx context.Context, eventID, userID string) (EventInvite, error)
	RespondToEventInvite(ctx context.Context, eventID, userID string, status EventInviteStatus) (EventInvite, error)
	ListEventAttendees(ctx context.Context, eventID string) ([]Attendee, error)
	CreateEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error)
	ForwardEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error)
	DeleteEventInvite(ctx context.Context, eventID, userID string) error
	ListPendingInvitesWithRsvpDeadlineOn(ctx context.Context, day time.Time) ([]ReminderInvite, error)
	ListAcceptedInvitesWithEventOn(ctx context.Context, day time.Time) ([]ReminderInvite, error)
}

// notifier is satisfied by notification.Service. It's optional: nil is a
// valid value (e.g. in tests that don't care about notifications), in which
// case notify becomes a no-op.
type notifier interface {
	Notify(ctx context.Context, userID, notificationType string, payload map[string]any) error
}

type Service struct {
	repo     repository
	notifier notifier
}

func NewService(repo repository, notifier notifier) *Service {
	return &Service{repo: repo, notifier: notifier}
}

func (s *Service) notify(ctx context.Context, userID, notificationType string, payload map[string]any) {
	if s.notifier == nil {
		return
	}
	if err := s.notifier.Notify(ctx, userID, notificationType, payload); err != nil {
		slog.Error("failed to create notification", "error", err, "type", notificationType, "userId", userID)
	}
}

// notifyInvitees notifies every attendee of eventID except the actor
// themselves (typically the owner, whose own edit doesn't need announcing to
// them).
func (s *Service) notifyInvitees(ctx context.Context, eventID string, notificationType string, payload map[string]any, excludeUserID string) {
	if s.notifier == nil {
		return
	}
	attendees, err := s.repo.ListEventAttendees(ctx, eventID)
	if err != nil {
		slog.Error("failed to list attendees for notification", "error", err, "eventId", eventID)
		return
	}
	for _, attendee := range attendees {
		if attendee.UserID == excludeUserID {
			continue
		}
		s.notify(ctx, attendee.UserID, notificationType, payload)
	}
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

	updated, err := s.repo.UpdateEvent(ctx, eventUpdate, eventID, ownerID)
	if err == nil {
		s.notifyInvitees(ctx, eventID, notificationEventUpdated, map[string]any{"eventId": eventID}, ownerID)
	}
	return updated, err
}

func (s *Service) GetEvents(ctx context.Context, userID string, sortField EventSortField, order SortOrder, scope EventListScope) ([]EventView, error) {
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
	spreadAllowed := invite.SpreadAllowed
	return EventView{Event: ev, ViewerInviteStatus: &status, ViewerSpreadAllowed: &spreadAllowed}, nil
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
	ev, err := s.repo.GetEvent(ctx, eventID)
	if err != nil {
		return EventInvite{}, err
	}
	if rsvpClosed(ev) {
		return EventInvite{}, ErrRsvpClosed
	}
	updated, err := s.repo.RespondToEventInvite(ctx, eventID, userID, status)
	if err == nil {
		s.notify(ctx, updated.InvitedBy, notificationInviteResponse, map[string]any{
			"eventId": eventID,
			"actorId": userID,
			"status":  string(status),
		})
	}
	return updated, err
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
		if err == nil {
			s.notify(ctx, payload.InvitedUserID, notificationEventInvite, map[string]any{
				"eventId": payload.EventID,
				"actorId": invitedBy,
			})
		}
		return createdInvite, err
	}

	if rsvpClosed(event) {
		return EventInvite{}, ErrRsvpClosed
	}

	payload.SpreadAllowed = 0
	createdInvite, err := s.repo.ForwardEventInvite(ctx, payload, invitedBy)
	if err == nil {
		s.notify(ctx, payload.InvitedUserID, notificationEventInvite, map[string]any{
			"eventId": payload.EventID,
			"actorId": invitedBy,
		})
	}
	return createdInvite, err
}

// RemoveEventInvite uninvites targetUserID from an event. Only the event's
// owner (who can remove anyone) or the invite's original inviter (who can
// only remove people they personally invited) may do this.
func (s *Service) RemoveEventInvite(ctx context.Context, eventID, removerID, targetUserID string) error {
	ev, err := s.repo.GetEvent(ctx, eventID)
	if err != nil {
		return err
	}
	if ev.OwnerId == removerID {
		err := s.repo.DeleteEventInvite(ctx, eventID, targetUserID)
		if err == nil {
			s.notify(ctx, targetUserID, notificationEventUninvite, map[string]any{
				"eventId": eventID,
				"actorId": removerID,
			})
		}
		return err
	}

	if rsvpClosed(ev) {
		return ErrRsvpClosed
	}

	invite, err := s.repo.GetEventInvite(ctx, eventID, targetUserID)
	if err != nil {
		return err
	}
	if invite.InvitedBy != removerID {
		return ErrRemoveNotAllowed
	}
	err = s.repo.DeleteEventInvite(ctx, eventID, targetUserID)
	if err == nil {
		s.notify(ctx, targetUserID, notificationEventUninvite, map[string]any{
			"eventId": eventID,
			"actorId": removerID,
		})
	}
	return err
}

// SendDailyReminders raises the two time-based reminder notifications for
// the given day: an RSVP deadline reminder for pending invitees whose
// event's deadline falls the day after now, and an event-starting-today
// reminder for accepted invitees whose event falls on now's calendar day.
// It's meant to be invoked once a day by an external scheduler (e.g. a k8s
// CronJob), rather than a ticker owned by the API process — the repository
// queries it drives are idempotent (they exclude invites that already have
// a matching notification), so calling it more than once for the same day,
// or from more than one job run at once, never double-sends.
func (s *Service) SendDailyReminders(ctx context.Context, now time.Time) error {
	tomorrow := now.AddDate(0, 0, 1)
	deadlineInvites, err := s.repo.ListPendingInvitesWithRsvpDeadlineOn(ctx, tomorrow)
	if err != nil {
		return fmt.Errorf("listing invites with upcoming rsvp deadline: %w", err)
	}
	for _, invite := range deadlineInvites {
		s.notify(ctx, invite.InvitedUserID, notificationRsvpDeadlineReminder, map[string]any{"eventId": invite.EventID})
	}

	todayInvites, err := s.repo.ListAcceptedInvitesWithEventOn(ctx, now)
	if err != nil {
		return fmt.Errorf("listing invites with event today: %w", err)
	}
	for _, invite := range todayInvites {
		s.notify(ctx, invite.InvitedUserID, notificationEventStartingToday, map[string]any{"eventId": invite.EventID})
	}

	return nil
}

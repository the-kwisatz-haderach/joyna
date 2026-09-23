package eventtemplate

import (
	"errors"
	"regexp"
	"strings"
	"time"
)

// EventTemplate lets a user pre-populate a set of event fields so that
// creating a new event can start from a preset instead of a blank form. The
// date/RSVP deadline fields are deliberately generic (DateOption,
// RsvpDeadlineOption) rather than concrete timestamps — resolving them into
// an actual date is the event-creation form's job, done at the moment a
// template is applied, not when the template itself is stored.
type EventTemplate struct {
	ID                 string             `json:"id" db:"id"`
	OwnerID            string             `json:"ownerId" db:"owner_id"`
	Name               string             `json:"name" db:"name"`
	Icon               string             `json:"icon" db:"icon"`
	CreatedAt          time.Time          `json:"createdAt" db:"created_at"`
	Title              string             `json:"title" db:"title"`
	DateOption         DateOption         `json:"dateOption" db:"date_option"`
	TimeOfDay          *string            `json:"timeOfDay,omitempty" db:"time_of_day"`
	Location           string             `json:"location" db:"location"`
	RsvpDeadlineOption RsvpDeadlineOption `json:"rsvpDeadlineOption" db:"rsvp_deadline_option"`
	Mood               *string            `json:"mood,omitempty" db:"mood"`
	Description        string             `json:"description" db:"description"`
}

type DateOption string

const (
	DateOptionNone      DateOption = "none"
	DateOptionToday     DateOption = "today"
	DateOptionMonday    DateOption = "monday"
	DateOptionTuesday   DateOption = "tuesday"
	DateOptionWednesday DateOption = "wednesday"
	DateOptionThursday  DateOption = "thursday"
	DateOptionFriday    DateOption = "friday"
	DateOptionSaturday  DateOption = "saturday"
	DateOptionSunday    DateOption = "sunday"
)

func (o DateOption) valid() bool {
	switch o {
	case DateOptionNone, DateOptionToday, DateOptionMonday, DateOptionTuesday, DateOptionWednesday, DateOptionThursday, DateOptionFriday, DateOptionSaturday, DateOptionSunday:
		return true
	default:
		return false
	}
}

type RsvpDeadlineOption string

const (
	RsvpDeadlineOptionNone      RsvpDeadlineOption = "none"
	RsvpDeadlineOptionOneDay    RsvpDeadlineOption = "1_day_before"
	RsvpDeadlineOptionThreeDays RsvpDeadlineOption = "3_days_before"
	RsvpDeadlineOptionOneWeek   RsvpDeadlineOption = "1_week_before"
)

func (o RsvpDeadlineOption) valid() bool {
	switch o {
	case RsvpDeadlineOptionNone, RsvpDeadlineOptionOneDay, RsvpDeadlineOptionThreeDays, RsvpDeadlineOptionOneWeek:
		return true
	default:
		return false
	}
}

// timeOfDay accepts either a specific 24h clock time ("17:00") or a generic
// period-of-day keyword ("evening") — templates like "Movie night" intentionally
// stay vague about the exact time, while others like "Afterwork today" pin one down.
var timeOfDayPattern = regexp.MustCompile(`^([01]\d|2[0-3]):[0-5]\d$`)

var timeOfDayKeywords = map[string]bool{
	"morning":   true,
	"afternoon": true,
	"evening":   true,
	"night":     true,
}

func validTimeOfDay(s string) bool {
	return timeOfDayPattern.MatchString(s) || timeOfDayKeywords[s]
}

var (
	ErrTemplateNameRequired  = errors.New("template name must not be empty")
	ErrTemplateIconRequired  = errors.New("template icon must not be empty")
	ErrTemplateTitleRequired = errors.New("template title must not be empty")
	ErrInvalidDateOption     = errors.New("invalid date option supplied")
	ErrInvalidRsvpOption     = errors.New("invalid rsvp deadline option supplied")
	ErrInvalidTimeOfDay      = errors.New("timeOfDay must be in HH:MM 24h format")
)

type CreateEventTemplatePayload struct {
	Name               string             `json:"name"`
	Icon               string             `json:"icon"`
	Title              string             `json:"title"`
	DateOption         DateOption         `json:"dateOption"`
	TimeOfDay          *string            `json:"timeOfDay,omitempty"`
	Location           string             `json:"location"`
	RsvpDeadlineOption RsvpDeadlineOption `json:"rsvpDeadlineOption"`
	Mood               *string            `json:"mood,omitempty"`
	Description        string             `json:"description"`
}

func (p *CreateEventTemplatePayload) Sanitize() {
	p.Name = strings.TrimSpace(p.Name)
	p.Icon = strings.TrimSpace(p.Icon)
	p.Title = strings.TrimSpace(p.Title)
	p.Location = strings.TrimSpace(p.Location)
	p.Description = strings.TrimSpace(p.Description)
	if p.DateOption == "" {
		p.DateOption = DateOptionNone
	}
	if p.RsvpDeadlineOption == "" {
		p.RsvpDeadlineOption = RsvpDeadlineOptionNone
	}
}

func (p CreateEventTemplatePayload) Validate() error {
	if p.Name == "" {
		return ErrTemplateNameRequired
	}
	if p.Icon == "" {
		return ErrTemplateIconRequired
	}
	if p.Title == "" {
		return ErrTemplateTitleRequired
	}
	if !p.DateOption.valid() {
		return ErrInvalidDateOption
	}
	if !p.RsvpDeadlineOption.valid() {
		return ErrInvalidRsvpOption
	}
	if p.TimeOfDay != nil && !validTimeOfDay(*p.TimeOfDay) {
		return ErrInvalidTimeOfDay
	}
	return nil
}

type UpdateEventTemplatePayload struct {
	Name               *string             `json:"name,omitempty"`
	Icon               *string             `json:"icon,omitempty"`
	Title              *string             `json:"title,omitempty"`
	DateOption         *DateOption         `json:"dateOption,omitempty"`
	TimeOfDay          *string             `json:"timeOfDay,omitempty"`
	ClearTimeOfDay     bool                `json:"clearTimeOfDay,omitempty"`
	Location           *string             `json:"location,omitempty"`
	RsvpDeadlineOption *RsvpDeadlineOption `json:"rsvpDeadlineOption,omitempty"`
	Mood               *string             `json:"mood,omitempty"`
	ClearMood          bool                `json:"clearMood,omitempty"`
	Description        *string             `json:"description,omitempty"`
}

func (p *UpdateEventTemplatePayload) Sanitize() {
	if p.Name != nil {
		trimmed := strings.TrimSpace(*p.Name)
		p.Name = &trimmed
	}
	if p.Icon != nil {
		trimmed := strings.TrimSpace(*p.Icon)
		p.Icon = &trimmed
	}
	if p.Title != nil {
		trimmed := strings.TrimSpace(*p.Title)
		p.Title = &trimmed
	}
	if p.Location != nil {
		trimmed := strings.TrimSpace(*p.Location)
		p.Location = &trimmed
	}
	if p.Description != nil {
		trimmed := strings.TrimSpace(*p.Description)
		p.Description = &trimmed
	}
}

func (p UpdateEventTemplatePayload) Validate() error {
	if p.Name != nil && *p.Name == "" {
		return ErrTemplateNameRequired
	}
	if p.Icon != nil && *p.Icon == "" {
		return ErrTemplateIconRequired
	}
	if p.Title != nil && *p.Title == "" {
		return ErrTemplateTitleRequired
	}
	if p.DateOption != nil && !p.DateOption.valid() {
		return ErrInvalidDateOption
	}
	if p.RsvpDeadlineOption != nil && !p.RsvpDeadlineOption.valid() {
		return ErrInvalidRsvpOption
	}
	if p.TimeOfDay != nil && !validTimeOfDay(*p.TimeOfDay) {
		return ErrInvalidTimeOfDay
	}
	return nil
}

func strPtr(s string) *string { return &s }

// DefaultTemplates seeds every newly registered user with a starter set so
// the "New event" screen isn't empty on first login.
func DefaultTemplates() []CreateEventTemplatePayload {
	return []CreateEventTemplatePayload{
		{
			Name:               "Afterwork today",
			Icon:               "🍻",
			Title:              "Afterwork drinks",
			DateOption:         DateOptionToday,
			TimeOfDay:          strPtr("17:00"),
			Location:           "Ye ol' pub",
			RsvpDeadlineOption: RsvpDeadlineOptionNone,
			Mood:               strPtr("chill"),
		},
		{
			Name:               "Weekend board games",
			Icon:               "🎲",
			Title:              "Board game night",
			DateOption:         DateOptionSaturday,
			TimeOfDay:          strPtr("14:00"),
			RsvpDeadlineOption: RsvpDeadlineOptionNone,
			Mood:               strPtr("competitive"),
		},
		{
			Name:               "Birthday party",
			Icon:               "🥳",
			Title:              "Birthday party",
			DateOption:         DateOptionNone,
			RsvpDeadlineOption: RsvpDeadlineOptionOneWeek,
			Mood:               strPtr("party"),
		},
		{
			Name:               "Movie night",
			Icon:               "🍿",
			Title:              "Movie night",
			DateOption:         DateOptionNone,
			TimeOfDay:          strPtr("evening"),
			Location:           "at home",
			RsvpDeadlineOption: RsvpDeadlineOptionNone,
			Mood:               strPtr("cozy"),
		},
	}
}

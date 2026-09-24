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
// RsvpDeadlineAmount/RsvpDeadlineUnit) rather than concrete timestamps —
// resolving them into an actual date is the event-creation form's job, done
// at the moment a template is applied, not when the template itself is
// stored. RsvpDeadlineAmount/RsvpDeadlineUnit mirror the amount+unit picker
// on the event creation form (e.g. "2 weeks before") instead of a fixed set
// of presets; both are nil together to mean no deadline.
type EventTemplate struct {
	ID                 string            `json:"id" db:"id"`
	OwnerID            string            `json:"ownerId" db:"owner_id"`
	Name               string            `json:"name" db:"name"`
	Icon               string            `json:"icon" db:"icon"`
	CreatedAt          time.Time         `json:"createdAt" db:"created_at"`
	Title              string            `json:"title" db:"title"`
	DateOption         DateOption        `json:"dateOption" db:"date_option"`
	TimeOfDay          *string           `json:"timeOfDay,omitempty" db:"time_of_day"`
	Location           string            `json:"location" db:"location"`
	RsvpDeadlineAmount *int              `json:"rsvpDeadlineAmount,omitempty" db:"rsvp_deadline_amount"`
	RsvpDeadlineUnit   *RsvpDeadlineUnit `json:"rsvpDeadlineUnit,omitempty" db:"rsvp_deadline_unit"`
	Mood               *string           `json:"mood,omitempty" db:"mood"`
	Description        string            `json:"description" db:"description"`
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

// RsvpDeadlineUnit mirrors the unit choices on the event creation form's
// RSVP deadline picker ("N day(s)/week(s)/month(s) before").
type RsvpDeadlineUnit string

const (
	RsvpDeadlineUnitDay   RsvpDeadlineUnit = "day"
	RsvpDeadlineUnitWeek  RsvpDeadlineUnit = "week"
	RsvpDeadlineUnitMonth RsvpDeadlineUnit = "month"
)

func (u RsvpDeadlineUnit) valid() bool {
	switch u {
	case RsvpDeadlineUnitDay, RsvpDeadlineUnitWeek, RsvpDeadlineUnitMonth:
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
	ErrTemplateNameRequired           = errors.New("template name must not be empty")
	ErrTemplateIconRequired           = errors.New("template icon must not be empty")
	ErrTemplateTitleRequired          = errors.New("template title must not be empty")
	ErrInvalidDateOption              = errors.New("invalid date option supplied")
	ErrInvalidRsvpDeadlineUnit        = errors.New("invalid rsvp deadline unit supplied")
	ErrInvalidRsvpDeadlineAmount      = errors.New("rsvpDeadlineAmount must be greater than zero")
	ErrRsvpDeadlineAmountUnitMismatch = errors.New("rsvpDeadlineAmount and rsvpDeadlineUnit must both be set or both omitted")
	ErrInvalidTimeOfDay               = errors.New("timeOfDay must be in HH:MM 24h format")
)

// validateRsvpDeadline enforces that amount/unit are set together — either
// both nil (no deadline / no change) or both present and individually valid.
func validateRsvpDeadline(amount *int, unit *RsvpDeadlineUnit) error {
	if (amount == nil) != (unit == nil) {
		return ErrRsvpDeadlineAmountUnitMismatch
	}
	if amount != nil && *amount <= 0 {
		return ErrInvalidRsvpDeadlineAmount
	}
	if unit != nil && !unit.valid() {
		return ErrInvalidRsvpDeadlineUnit
	}
	return nil
}

type CreateEventTemplatePayload struct {
	Name               string            `json:"name"`
	Icon               string            `json:"icon"`
	Title              string            `json:"title"`
	DateOption         DateOption        `json:"dateOption"`
	TimeOfDay          *string           `json:"timeOfDay,omitempty"`
	Location           string            `json:"location"`
	RsvpDeadlineAmount *int              `json:"rsvpDeadlineAmount,omitempty"`
	RsvpDeadlineUnit   *RsvpDeadlineUnit `json:"rsvpDeadlineUnit,omitempty"`
	Mood               *string           `json:"mood,omitempty"`
	Description        string            `json:"description"`
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
	if err := validateRsvpDeadline(p.RsvpDeadlineAmount, p.RsvpDeadlineUnit); err != nil {
		return err
	}
	if p.TimeOfDay != nil && !validTimeOfDay(*p.TimeOfDay) {
		return ErrInvalidTimeOfDay
	}
	return nil
}

type UpdateEventTemplatePayload struct {
	Name               *string           `json:"name,omitempty"`
	Icon               *string           `json:"icon,omitempty"`
	Title              *string           `json:"title,omitempty"`
	DateOption         *DateOption       `json:"dateOption,omitempty"`
	TimeOfDay          *string           `json:"timeOfDay,omitempty"`
	ClearTimeOfDay     bool              `json:"clearTimeOfDay,omitempty"`
	Location           *string           `json:"location,omitempty"`
	RsvpDeadlineAmount *int              `json:"rsvpDeadlineAmount,omitempty"`
	RsvpDeadlineUnit   *RsvpDeadlineUnit `json:"rsvpDeadlineUnit,omitempty"`
	ClearRsvpDeadline  bool              `json:"clearRsvpDeadline,omitempty"`
	Mood               *string           `json:"mood,omitempty"`
	ClearMood          bool              `json:"clearMood,omitempty"`
	Description        *string           `json:"description,omitempty"`
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
	if err := validateRsvpDeadline(p.RsvpDeadlineAmount, p.RsvpDeadlineUnit); err != nil {
		return err
	}
	if p.TimeOfDay != nil && !validTimeOfDay(*p.TimeOfDay) {
		return ErrInvalidTimeOfDay
	}
	return nil
}

func strPtr(s string) *string { return &s }

func intPtr(i int) *int { return &i }

func rsvpUnitPtr(u RsvpDeadlineUnit) *RsvpDeadlineUnit { return &u }

// DefaultTemplates seeds every newly registered user with a starter set so
// the "New event" screen isn't empty on first login.
func DefaultTemplates() []CreateEventTemplatePayload {
	return []CreateEventTemplatePayload{
		{
			Name:       "Afterwork today",
			Icon:       "🍻",
			Title:      "Afterwork drinks",
			DateOption: DateOptionToday,
			TimeOfDay:  strPtr("17:00"),
			Location:   "Ye ol' pub",
			Mood:       strPtr("chill"),
		},
		{
			Name:       "Weekend board games",
			Icon:       "🎲",
			Title:      "Board game night",
			DateOption: DateOptionSaturday,
			TimeOfDay:  strPtr("14:00"),
			Mood:       strPtr("competitive"),
		},
		{
			Name:               "Birthday party",
			Icon:               "🥳",
			Title:              "Birthday party",
			DateOption:         DateOptionNone,
			RsvpDeadlineAmount: intPtr(1),
			RsvpDeadlineUnit:   rsvpUnitPtr(RsvpDeadlineUnitWeek),
			Mood:               strPtr("party"),
		},
		{
			Name:       "Movie night",
			Icon:       "🍿",
			Title:      "Movie night",
			DateOption: DateOptionNone,
			TimeOfDay:  strPtr("evening"),
			Location:   "at home",
			Mood:       strPtr("cozy"),
		},
	}
}

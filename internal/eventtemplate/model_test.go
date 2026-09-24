package eventtemplate

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func validPayload() CreateEventTemplatePayload {
	return CreateEventTemplatePayload{
		Name:       "Afterwork today",
		Icon:       strPtr("🍻"),
		Title:      "Afterwork drinks",
		DateOption: DateOptionNone,
	}
}

func TestCreateEventTemplatePayload_Sanitize_TrimsFieldsAndDefaultsOptions(t *testing.T) {
	payload := CreateEventTemplatePayload{
		Name:        "  Afterwork today  ",
		Icon:        strPtr("  🍻  "),
		Title:       "  Afterwork drinks  ",
		Location:    "  Ye ol' pub  ",
		Description: "  chill  ",
	}
	payload.Sanitize()

	require.Equal(t, "Afterwork today", payload.Name)
	require.Equal(t, "🍻", *payload.Icon)
	require.Equal(t, "Afterwork drinks", payload.Title)
	require.Equal(t, "Ye ol' pub", payload.Location)
	require.Equal(t, "chill", payload.Description)
	require.Equal(t, DateOptionNone, payload.DateOption)
	require.Nil(t, payload.RsvpDeadlineAmount)
	require.Nil(t, payload.RsvpDeadlineUnit)
}

func TestCreateEventTemplatePayload_Validate_Valid(t *testing.T) {
	require.NoError(t, validPayload().Validate())
}

func TestCreateEventTemplatePayload_Validate_MissingName(t *testing.T) {
	payload := validPayload()
	payload.Name = ""
	require.ErrorIs(t, payload.Validate(), ErrTemplateNameRequired)
}

func TestCreateEventTemplatePayload_Validate_NoIcon(t *testing.T) {
	payload := validPayload()
	payload.Icon = nil
	require.NoError(t, payload.Validate())
}

func TestCreateEventTemplatePayload_Validate_MissingTitle(t *testing.T) {
	payload := validPayload()
	payload.Title = ""
	require.ErrorIs(t, payload.Validate(), ErrTemplateTitleRequired)
}

func TestCreateEventTemplatePayload_Validate_InvalidDateOption(t *testing.T) {
	payload := validPayload()
	payload.DateOption = DateOption("someday")
	require.ErrorIs(t, payload.Validate(), ErrInvalidDateOption)
}

func TestCreateEventTemplatePayload_Validate_InvalidRsvpDeadlineUnit(t *testing.T) {
	payload := validPayload()
	amount := 1
	unit := RsvpDeadlineUnit("whenever")
	payload.RsvpDeadlineAmount = &amount
	payload.RsvpDeadlineUnit = &unit
	require.ErrorIs(t, payload.Validate(), ErrInvalidRsvpDeadlineUnit)
}

func TestCreateEventTemplatePayload_Validate_NonPositiveRsvpDeadlineAmount(t *testing.T) {
	payload := validPayload()
	amount := 0
	unit := RsvpDeadlineUnitDay
	payload.RsvpDeadlineAmount = &amount
	payload.RsvpDeadlineUnit = &unit
	require.ErrorIs(t, payload.Validate(), ErrInvalidRsvpDeadlineAmount)
}

func TestCreateEventTemplatePayload_Validate_RsvpDeadlineAmountWithoutUnit(t *testing.T) {
	payload := validPayload()
	amount := 1
	payload.RsvpDeadlineAmount = &amount
	require.ErrorIs(t, payload.Validate(), ErrRsvpDeadlineAmountUnitMismatch)
}

func TestCreateEventTemplatePayload_Validate_RsvpDeadlineUnitWithoutAmount(t *testing.T) {
	payload := validPayload()
	unit := RsvpDeadlineUnitDay
	payload.RsvpDeadlineUnit = &unit
	require.ErrorIs(t, payload.Validate(), ErrRsvpDeadlineAmountUnitMismatch)
}

func TestCreateEventTemplatePayload_Validate_ValidRsvpDeadline(t *testing.T) {
	payload := validPayload()
	amount := 2
	unit := RsvpDeadlineUnitMonth
	payload.RsvpDeadlineAmount = &amount
	payload.RsvpDeadlineUnit = &unit
	require.NoError(t, payload.Validate())
}

func TestCreateEventTemplatePayload_Validate_TimeOfDayClockTime(t *testing.T) {
	payload := validPayload()
	timeOfDay := "17:00"
	payload.TimeOfDay = &timeOfDay
	require.NoError(t, payload.Validate())
}

func TestCreateEventTemplatePayload_Validate_TimeOfDayKeyword(t *testing.T) {
	payload := validPayload()
	timeOfDay := "evening"
	payload.TimeOfDay = &timeOfDay
	require.NoError(t, payload.Validate())
}

func TestCreateEventTemplatePayload_Validate_InvalidTimeOfDay(t *testing.T) {
	payload := validPayload()
	timeOfDay := "5pm"
	payload.TimeOfDay = &timeOfDay
	require.ErrorIs(t, payload.Validate(), ErrInvalidTimeOfDay)
}

func TestUpdateEventTemplatePayload_Validate_Valid(t *testing.T) {
	require.NoError(t, UpdateEventTemplatePayload{}.Validate())
}

func TestUpdateEventTemplatePayload_Validate_EmptyNameRejected(t *testing.T) {
	empty := ""
	payload := UpdateEventTemplatePayload{Name: &empty}
	require.ErrorIs(t, payload.Validate(), ErrTemplateNameRequired)
}

func TestUpdateEventTemplatePayload_Sanitize_TrimsFields(t *testing.T) {
	name := "  New name  "
	payload := UpdateEventTemplatePayload{Name: &name}
	payload.Sanitize()
	require.Equal(t, "New name", *payload.Name)
}

func TestUpdateEventTemplatePayload_Validate_RsvpDeadlineAmountWithoutUnit(t *testing.T) {
	amount := 2
	payload := UpdateEventTemplatePayload{RsvpDeadlineAmount: &amount}
	require.ErrorIs(t, payload.Validate(), ErrRsvpDeadlineAmountUnitMismatch)
}

func TestUpdateEventTemplatePayload_Validate_NonPositiveRsvpDeadlineAmount(t *testing.T) {
	amount := 0
	unit := RsvpDeadlineUnitWeek
	payload := UpdateEventTemplatePayload{RsvpDeadlineAmount: &amount, RsvpDeadlineUnit: &unit}
	require.ErrorIs(t, payload.Validate(), ErrInvalidRsvpDeadlineAmount)
}

func TestUpdateEventTemplatePayload_Validate_ValidRsvpDeadline(t *testing.T) {
	amount := 3
	unit := RsvpDeadlineUnitDay
	payload := UpdateEventTemplatePayload{RsvpDeadlineAmount: &amount, RsvpDeadlineUnit: &unit}
	require.NoError(t, payload.Validate())
}

func TestDefaultTemplates_AllValid(t *testing.T) {
	for _, payload := range DefaultTemplates() {
		payload.Sanitize()
		require.NoError(t, payload.Validate(), "default template %q should be valid", payload.Name)
	}
}

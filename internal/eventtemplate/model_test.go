package eventtemplate

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func validPayload() CreateEventTemplatePayload {
	return CreateEventTemplatePayload{
		Name:               "Afterwork today",
		Icon:               "🍻",
		Title:              "Afterwork drinks",
		DateOption:         DateOptionNone,
		RsvpDeadlineOption: RsvpDeadlineOptionNone,
	}
}

func TestCreateEventTemplatePayload_Sanitize_TrimsFieldsAndDefaultsOptions(t *testing.T) {
	payload := CreateEventTemplatePayload{
		Name:        "  Afterwork today  ",
		Icon:        "  🍻  ",
		Title:       "  Afterwork drinks  ",
		Location:    "  Ye ol' pub  ",
		Description: "  chill  ",
	}
	payload.Sanitize()

	require.Equal(t, "Afterwork today", payload.Name)
	require.Equal(t, "🍻", payload.Icon)
	require.Equal(t, "Afterwork drinks", payload.Title)
	require.Equal(t, "Ye ol' pub", payload.Location)
	require.Equal(t, "chill", payload.Description)
	require.Equal(t, DateOptionNone, payload.DateOption)
	require.Equal(t, RsvpDeadlineOptionNone, payload.RsvpDeadlineOption)
}

func TestCreateEventTemplatePayload_Validate_Valid(t *testing.T) {
	require.NoError(t, validPayload().Validate())
}

func TestCreateEventTemplatePayload_Validate_MissingName(t *testing.T) {
	payload := validPayload()
	payload.Name = ""
	require.ErrorIs(t, payload.Validate(), ErrTemplateNameRequired)
}

func TestCreateEventTemplatePayload_Validate_MissingIcon(t *testing.T) {
	payload := validPayload()
	payload.Icon = ""
	require.ErrorIs(t, payload.Validate(), ErrTemplateIconRequired)
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

func TestCreateEventTemplatePayload_Validate_InvalidRsvpOption(t *testing.T) {
	payload := validPayload()
	payload.RsvpDeadlineOption = RsvpDeadlineOption("whenever")
	require.ErrorIs(t, payload.Validate(), ErrInvalidRsvpOption)
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

func TestDefaultTemplates_AllValid(t *testing.T) {
	for _, payload := range DefaultTemplates() {
		payload.Sanitize()
		require.NoError(t, payload.Validate(), "default template %q should be valid", payload.Name)
	}
}

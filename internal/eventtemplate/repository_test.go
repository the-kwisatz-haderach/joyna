//go:build integration
// +build integration

package eventtemplate

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/the-kwisatz-haderach/joyna/internal/auth/authtest"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/dbtest"
)

// minimalPayload has just enough set to satisfy the DB's CHECK constraints —
// repo.CreateTemplate doesn't apply CreateEventTemplatePayload.Sanitize()'s
// defaults itself (that's the handler's job), so callers here must supply
// valid enum values explicitly instead of relying on Go's zero value.
func minimalPayload(name, icon, title string) CreateEventTemplatePayload {
	return CreateEventTemplatePayload{
		Name:       name,
		Icon:       icon,
		Title:      title,
		DateOption: DateOptionNone,
	}
}

func TestEventTemplateRepository(t *testing.T) {
	ctx := context.Background()
	pgContainer, err := dbtest.InitTestContainer(ctx)
	testcontainers.CleanupContainer(t, pgContainer)
	require.NoError(t, err)

	pool, err := dbtest.NewPoolWithMigrations(ctx, pgContainer)
	require.NoError(t, err)
	defer pool.Close()

	repo := NewRepository(pool)
	owner := authtest.CreateUser(t, pool)

	t.Run("ListTemplates empty", func(t *testing.T) {
		emptyOwner := authtest.CreateUser(t, pool)
		templates, err := repo.ListTemplates(ctx, emptyOwner.Id)
		require.NoError(t, err)
		require.Empty(t, templates)
	})

	t.Run("CreateTemplate and ListTemplates", func(t *testing.T) {
		listOwner := authtest.CreateUser(t, pool)
		timeOfDay := "17:00"
		mood := "chill"
		afterwork := minimalPayload("Afterwork today", "🍻", "Afterwork drinks")
		afterwork.DateOption = DateOptionToday
		afterwork.TimeOfDay = &timeOfDay
		afterwork.Location = "Ye ol' pub"
		afterwork.Mood = &mood
		_, err := repo.CreateTemplate(ctx, afterwork, listOwner.Id)
		require.NoError(t, err)

		_, err = repo.CreateTemplate(ctx, minimalPayload("Movie night", "🍿", "Movie night"), listOwner.Id)
		require.NoError(t, err)

		templates, err := repo.ListTemplates(ctx, listOwner.Id)
		require.NoError(t, err)
		require.Len(t, templates, 2)
		require.Equal(t, "Afterwork today", templates[0].Name)
		require.Equal(t, listOwner.Id, templates[0].OwnerID)
		require.Equal(t, DateOptionToday, templates[0].DateOption)
		require.Equal(t, "17:00", *templates[0].TimeOfDay)
		require.Equal(t, "chill", *templates[0].Mood)
		require.False(t, templates[0].CreatedAt.IsZero())
		require.Equal(t, "Movie night", templates[1].Name)
	})

	t.Run("CreateTemplate invalid mood", func(t *testing.T) {
		mood := "not-a-real-mood"
		payload := minimalPayload("Bad mood", "😬", "Bad mood")
		payload.Mood = &mood
		_, err := repo.CreateTemplate(ctx, payload, owner.Id)
		require.ErrorIs(t, err, ErrInvalidMood)
	})

	t.Run("CreateTemplate and ListTemplates with rsvp deadline", func(t *testing.T) {
		amount := 2
		unit := RsvpDeadlineUnitWeek
		payload := minimalPayload("Birthday party", "🥳", "Birthday party")
		payload.RsvpDeadlineAmount = &amount
		payload.RsvpDeadlineUnit = &unit
		created, err := repo.CreateTemplate(ctx, payload, owner.Id)
		require.NoError(t, err)
		require.Equal(t, 2, *created.RsvpDeadlineAmount)
		require.Equal(t, RsvpDeadlineUnitWeek, *created.RsvpDeadlineUnit)
	})

	t.Run("UpdateTemplate", func(t *testing.T) {
		created, err := repo.CreateTemplate(ctx, minimalPayload("To rename", "🎲", "Board games"), owner.Id)
		require.NoError(t, err)

		newName := "Renamed template"
		updated, err := repo.UpdateTemplate(ctx, UpdateEventTemplatePayload{Name: &newName}, created.ID, owner.Id)
		require.NoError(t, err)
		require.Equal(t, newName, updated.Name)
	})

	t.Run("UpdateTemplate clears optional fields", func(t *testing.T) {
		timeOfDay := "14:00"
		mood := "chill"
		amount := 1
		unit := RsvpDeadlineUnitDay
		payload := minimalPayload("Has optional fields", "🎲", "Board games")
		payload.TimeOfDay = &timeOfDay
		payload.Mood = &mood
		payload.RsvpDeadlineAmount = &amount
		payload.RsvpDeadlineUnit = &unit
		created, err := repo.CreateTemplate(ctx, payload, owner.Id)
		require.NoError(t, err)

		updated, err := repo.UpdateTemplate(ctx, UpdateEventTemplatePayload{ClearTimeOfDay: true, ClearMood: true, ClearRsvpDeadline: true}, created.ID, owner.Id)
		require.NoError(t, err)
		require.Nil(t, updated.TimeOfDay)
		require.Nil(t, updated.Mood)
		require.Nil(t, updated.RsvpDeadlineAmount)
		require.Nil(t, updated.RsvpDeadlineUnit)
	})

	t.Run("UpdateTemplate sets rsvp deadline", func(t *testing.T) {
		created, err := repo.CreateTemplate(ctx, minimalPayload("No deadline yet", "🎲", "Board games"), owner.Id)
		require.NoError(t, err)

		amount := 3
		unit := RsvpDeadlineUnitMonth
		updated, err := repo.UpdateTemplate(ctx, UpdateEventTemplatePayload{RsvpDeadlineAmount: &amount, RsvpDeadlineUnit: &unit}, created.ID, owner.Id)
		require.NoError(t, err)
		require.Equal(t, 3, *updated.RsvpDeadlineAmount)
		require.Equal(t, RsvpDeadlineUnitMonth, *updated.RsvpDeadlineUnit)
	})

	t.Run("UpdateTemplate not found", func(t *testing.T) {
		newName := "doesn't matter"
		_, err := repo.UpdateTemplate(ctx, UpdateEventTemplatePayload{Name: &newName}, uuid.NewString(), owner.Id)
		require.ErrorIs(t, err, ErrTemplateNotFound)
	})

	t.Run("DeleteTemplate", func(t *testing.T) {
		created, err := repo.CreateTemplate(ctx, minimalPayload("To delete", "🥳", "Party"), owner.Id)
		require.NoError(t, err)

		err = repo.DeleteTemplate(ctx, created.ID, owner.Id)
		require.NoError(t, err)

		newName := "doesn't matter"
		_, err = repo.UpdateTemplate(ctx, UpdateEventTemplatePayload{Name: &newName}, created.ID, owner.Id)
		require.ErrorIs(t, err, ErrTemplateNotFound)
	})

	t.Run("DeleteTemplate not found", func(t *testing.T) {
		err := repo.DeleteTemplate(ctx, uuid.NewString(), owner.Id)
		require.ErrorIs(t, err, ErrTemplateNotFound)
	})

	t.Run("SeedDefaultTemplates", func(t *testing.T) {
		seedOwner := authtest.CreateUser(t, pool)
		err := repo.SeedDefaultTemplates(ctx, seedOwner.Id)
		require.NoError(t, err)

		templates, err := repo.ListTemplates(ctx, seedOwner.Id)
		require.NoError(t, err)
		require.Len(t, templates, len(DefaultTemplates()))
	})
}

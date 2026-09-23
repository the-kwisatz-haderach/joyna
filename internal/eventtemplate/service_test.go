package eventtemplate

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type fakeRepository struct {
	listTemplatesFunc        func(ctx context.Context, ownerID string) ([]EventTemplate, error)
	createTemplateFunc       func(ctx context.Context, template CreateEventTemplatePayload, ownerID string) (EventTemplate, error)
	updateTemplateFunc       func(ctx context.Context, templateUpdate UpdateEventTemplatePayload, templateID, ownerID string) (EventTemplate, error)
	deleteTemplateFunc       func(ctx context.Context, templateID, ownerID string) error
	seedDefaultTemplatesFunc func(ctx context.Context, ownerID string) error
}

func (f *fakeRepository) ListTemplates(ctx context.Context, ownerID string) ([]EventTemplate, error) {
	return f.listTemplatesFunc(ctx, ownerID)
}

func (f *fakeRepository) CreateTemplate(ctx context.Context, template CreateEventTemplatePayload, ownerID string) (EventTemplate, error) {
	return f.createTemplateFunc(ctx, template, ownerID)
}

func (f *fakeRepository) UpdateTemplate(ctx context.Context, templateUpdate UpdateEventTemplatePayload, templateID, ownerID string) (EventTemplate, error) {
	return f.updateTemplateFunc(ctx, templateUpdate, templateID, ownerID)
}

func (f *fakeRepository) DeleteTemplate(ctx context.Context, templateID, ownerID string) error {
	return f.deleteTemplateFunc(ctx, templateID, ownerID)
}

func (f *fakeRepository) SeedDefaultTemplates(ctx context.Context, ownerID string) error {
	return f.seedDefaultTemplatesFunc(ctx, ownerID)
}

func TestListTemplates(t *testing.T) {
	templates := []EventTemplate{{ID: "template-id", Name: "Afterwork today"}}
	repo := &fakeRepository{
		listTemplatesFunc: func(ctx context.Context, ownerID string) ([]EventTemplate, error) {
			require.Equal(t, "owner-id", ownerID)
			return templates, nil
		},
	}
	service := NewService(repo)
	got, err := service.ListTemplates(context.Background(), "owner-id")
	require.NoError(t, err)
	require.Equal(t, templates, got)
}

func TestListTemplates_RepositoryError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepository{
		listTemplatesFunc: func(ctx context.Context, ownerID string) ([]EventTemplate, error) {
			return nil, repoErr
		},
	}
	service := NewService(repo)
	_, err := service.ListTemplates(context.Background(), "owner-id")
	require.ErrorIs(t, err, repoErr)
}

func TestCreateTemplate(t *testing.T) {
	created := EventTemplate{ID: "template-id", Name: "Afterwork today"}
	repo := &fakeRepository{
		createTemplateFunc: func(ctx context.Context, template CreateEventTemplatePayload, ownerID string) (EventTemplate, error) {
			require.Equal(t, "owner-id", ownerID)
			return created, nil
		},
	}
	service := NewService(repo)
	got, err := service.CreateTemplate(context.Background(), CreateEventTemplatePayload{Name: "Afterwork today"}, "owner-id")
	require.NoError(t, err)
	require.Equal(t, created, got)
}

func TestUpdateTemplate(t *testing.T) {
	updated := EventTemplate{ID: "template-id", Name: "renamed"}
	repo := &fakeRepository{
		updateTemplateFunc: func(ctx context.Context, templateUpdate UpdateEventTemplatePayload, templateID, ownerID string) (EventTemplate, error) {
			require.Equal(t, "template-id", templateID)
			require.Equal(t, "owner-id", ownerID)
			return updated, nil
		},
	}
	service := NewService(repo)
	got, err := service.UpdateTemplate(context.Background(), UpdateEventTemplatePayload{}, "template-id", "owner-id")
	require.NoError(t, err)
	require.Equal(t, updated, got)
}

func TestUpdateTemplate_NotFound(t *testing.T) {
	repo := &fakeRepository{
		updateTemplateFunc: func(ctx context.Context, templateUpdate UpdateEventTemplatePayload, templateID, ownerID string) (EventTemplate, error) {
			return EventTemplate{}, ErrTemplateNotFound
		},
	}
	service := NewService(repo)
	_, err := service.UpdateTemplate(context.Background(), UpdateEventTemplatePayload{}, "template-id", "owner-id")
	require.ErrorIs(t, err, ErrTemplateNotFound)
}

func TestDeleteTemplate(t *testing.T) {
	var called bool
	repo := &fakeRepository{
		deleteTemplateFunc: func(ctx context.Context, templateID, ownerID string) error {
			called = true
			require.Equal(t, "template-id", templateID)
			require.Equal(t, "owner-id", ownerID)
			return nil
		},
	}
	service := NewService(repo)
	err := service.DeleteTemplate(context.Background(), "template-id", "owner-id")
	require.NoError(t, err)
	require.True(t, called)
}

func TestDeleteTemplate_NotFound(t *testing.T) {
	repo := &fakeRepository{
		deleteTemplateFunc: func(ctx context.Context, templateID, ownerID string) error {
			return ErrTemplateNotFound
		},
	}
	service := NewService(repo)
	err := service.DeleteTemplate(context.Background(), "template-id", "owner-id")
	require.ErrorIs(t, err, ErrTemplateNotFound)
}

func TestSeedDefaultTemplates(t *testing.T) {
	var called bool
	repo := &fakeRepository{
		seedDefaultTemplatesFunc: func(ctx context.Context, ownerID string) error {
			called = true
			require.Equal(t, "owner-id", ownerID)
			return nil
		},
	}
	service := NewService(repo)
	err := service.SeedDefaultTemplates(context.Background(), "owner-id")
	require.NoError(t, err)
	require.True(t, called)
}

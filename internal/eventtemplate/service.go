package eventtemplate

import "context"

type repository interface {
	ListTemplates(ctx context.Context, ownerID string) ([]EventTemplate, error)
	CreateTemplate(ctx context.Context, template CreateEventTemplatePayload, ownerID string) (EventTemplate, error)
	UpdateTemplate(ctx context.Context, templateUpdate UpdateEventTemplatePayload, templateID, ownerID string) (EventTemplate, error)
	DeleteTemplate(ctx context.Context, templateID, ownerID string) error
	SeedDefaultTemplates(ctx context.Context, ownerID string) error
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListTemplates(ctx context.Context, ownerID string) ([]EventTemplate, error) {
	return s.repo.ListTemplates(ctx, ownerID)
}

func (s *Service) CreateTemplate(ctx context.Context, payload CreateEventTemplatePayload, ownerID string) (EventTemplate, error) {
	return s.repo.CreateTemplate(ctx, payload, ownerID)
}

func (s *Service) UpdateTemplate(ctx context.Context, templateUpdate UpdateEventTemplatePayload, templateID, ownerID string) (EventTemplate, error) {
	return s.repo.UpdateTemplate(ctx, templateUpdate, templateID, ownerID)
}

func (s *Service) DeleteTemplate(ctx context.Context, templateID, ownerID string) error {
	return s.repo.DeleteTemplate(ctx, templateID, ownerID)
}

// SeedDefaultTemplates satisfies auth's templateSeeder interface, called once
// right after a new user is created.
func (s *Service) SeedDefaultTemplates(ctx context.Context, ownerID string) error {
	return s.repo.SeedDefaultTemplates(ctx, ownerID)
}

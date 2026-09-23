CREATE TABLE
  event_templates (
    id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID (),
    owner_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    title TEXT NOT NULL,
    date_option TEXT NOT NULL DEFAULT 'none' CHECK (
      date_option IN (
        'none',
        'today',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      )
    ),
    time_of_day TEXT,
    location TEXT NOT NULL DEFAULT '',
    rsvp_deadline_option TEXT NOT NULL DEFAULT 'none' CHECK (
      rsvp_deadline_option IN ('none', '1_day_before', '3_days_before', '1_week_before')
    ),
    mood TEXT REFERENCES event_moods (name),
    description TEXT NOT NULL DEFAULT ''
  );

CREATE INDEX idx_event_templates_owner_id ON event_templates (owner_id);

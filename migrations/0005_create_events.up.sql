CREATE TABLE
  events (
    id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID (),
    owner_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    date TIMESTAMPTZ NOT NULL,
    location TEXT,
    rsvp_deadline TIMESTAMPTZ,
    type TEXT NOT NULL REFERENCES event_types (name),
    default_spread_allowed INT NOT NULL DEFAULT 0
  );

CREATE INDEX idx_events_owner_id ON events (owner_id);

CREATE INDEX idx_events_date ON events (date)
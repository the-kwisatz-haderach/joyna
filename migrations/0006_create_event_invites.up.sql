CREATE TABLE
  event_invites (
    event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    spread_allowed INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    PRIMARY KEY (event_id, invited_user_id)
  )

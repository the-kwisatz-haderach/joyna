CREATE TABLE
  connections (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    is_favorite BOOL NOT NULL DEFAULT FALSE,
    connection_group_id UUID REFERENCES connection_groups (id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, contact_id),
    -- Suggested addition: prevent a user from connecting to themselves. Remove if not desired.
    CHECK (user_id <> contact_id)
  )

CREATE TABLE
  connection_groups (
    id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID (),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    is_favorite BOOL NOT NULL DEFAULT FALSE
  );

CREATE INDEX idx_connection_groups_owner_id ON connection_groups (owner_id)
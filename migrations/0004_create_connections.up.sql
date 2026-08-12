CREATE TABLE
  connections (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    is_favorite BOOL NOT NULL DEFAULT FALSE,
    connection_group_id UUID REFERENCES connection_groups (id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, contact_id),
    CHECK (user_id <> contact_id)
  );

CREATE INDEX idx_connections_contact_id ON connections (contact_id);

CREATE INDEX idx_connections_connection_group_id ON connections (connection_group_id)

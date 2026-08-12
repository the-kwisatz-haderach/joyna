CREATE TABLE
  notifications (
    id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
  );

CREATE INDEX idx_notifications_user_id ON notifications (user_id)

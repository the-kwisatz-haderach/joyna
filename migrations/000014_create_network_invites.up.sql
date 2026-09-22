CREATE TABLE
  network_invites (
    id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID (),
    inviter_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    token UUID NOT NULL DEFAULT GEN_RANDOM_UUID (),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    accepted_at TIMESTAMPTZ
  );

CREATE UNIQUE INDEX idx_network_invites_token ON network_invites (token);

CREATE UNIQUE INDEX idx_network_invites_pending_inviter_email ON network_invites (inviter_id, invited_email)
WHERE
  accepted_at IS NULL;

CREATE INDEX idx_network_invites_pending_email ON network_invites (invited_email)
WHERE
  accepted_at IS NULL;

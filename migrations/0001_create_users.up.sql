CREATE TABLE
  users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW (),
    profile_picture_key TEXT
  )

CREATE TABLE
  users (
    id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID (),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    joined_at TIMESTAMPTZ DEFAULT NOW (),
    profile_picture_key TEXT
  )
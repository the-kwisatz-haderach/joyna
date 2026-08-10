CREATE TABLE
  credentials (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  )

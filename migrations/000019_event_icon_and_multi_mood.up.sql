ALTER TABLE events
  ADD COLUMN icon TEXT,
  DROP COLUMN mood;

ALTER TABLE events
  ADD COLUMN mood TEXT[] NOT NULL DEFAULT '{}' CONSTRAINT events_mood_check CHECK (
    mood <@ ARRAY[
      'chill', 'fun', 'party', 'cozy', 'adventure', 'romantic',
      'competitive', 'low-key', 'social', 'celebration', 'formal', 'learning'
    ]::TEXT[]
  );

ALTER TABLE event_templates
  ALTER COLUMN icon DROP NOT NULL,
  DROP COLUMN mood;

ALTER TABLE event_templates
  ADD COLUMN mood TEXT[] NOT NULL DEFAULT '{}' CONSTRAINT event_templates_mood_check CHECK (
    mood <@ ARRAY[
      'chill', 'fun', 'party', 'cozy', 'adventure', 'romantic',
      'competitive', 'low-key', 'social', 'celebration', 'formal', 'learning'
    ]::TEXT[]
  );

DROP TABLE event_moods;

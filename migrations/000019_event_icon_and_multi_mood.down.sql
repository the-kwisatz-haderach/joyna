CREATE TABLE
  event_moods (name TEXT PRIMARY KEY);

INSERT INTO
  event_moods (name)
VALUES
  ('chill'),
  ('fun'),
  ('party'),
  ('cozy'),
  ('adventure'),
  ('romantic'),
  ('competitive'),
  ('low-key');

ALTER TABLE events
  DROP COLUMN mood,
  DROP COLUMN icon;

ALTER TABLE events
  ADD COLUMN mood TEXT REFERENCES event_moods (name);

ALTER TABLE event_templates
  DROP COLUMN mood;

ALTER TABLE event_templates
  ADD COLUMN mood TEXT REFERENCES event_moods (name),
  ALTER COLUMN icon SET NOT NULL;

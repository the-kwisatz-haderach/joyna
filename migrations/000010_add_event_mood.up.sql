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
ADD COLUMN mood TEXT REFERENCES event_moods (name);

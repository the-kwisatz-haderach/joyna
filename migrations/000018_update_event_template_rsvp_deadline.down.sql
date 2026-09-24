ALTER TABLE event_templates
  DROP CONSTRAINT event_templates_rsvp_deadline_amount_unit_together,
  DROP COLUMN rsvp_deadline_amount,
  DROP COLUMN rsvp_deadline_unit,
  ADD COLUMN rsvp_deadline_option TEXT NOT NULL DEFAULT 'none' CHECK (
    rsvp_deadline_option IN ('none', '1_day_before', '3_days_before', '1_week_before')
  );

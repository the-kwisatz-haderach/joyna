ALTER TABLE event_templates
  DROP COLUMN rsvp_deadline_option,
  ADD COLUMN rsvp_deadline_amount INTEGER CHECK (rsvp_deadline_amount > 0),
  ADD COLUMN rsvp_deadline_unit TEXT CHECK (rsvp_deadline_unit IN ('day', 'week', 'month')),
  ADD CONSTRAINT event_templates_rsvp_deadline_amount_unit_together CHECK (
    (rsvp_deadline_amount IS NULL) = (rsvp_deadline_unit IS NULL)
  );

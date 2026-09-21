CREATE INDEX idx_notifications_user_type_event ON notifications (user_id, type, (payload ->> 'eventId'));

ALTER TABLE zunno.plan_events
    ADD COLUMN notified_start_at TIMESTAMPTZ;

CREATE INDEX idx_plan_events_notification
    ON zunno.plan_events (event_date)
    WHERE notified_start_at IS NULL AND is_done = false;

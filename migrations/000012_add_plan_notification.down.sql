DROP INDEX IF EXISTS zunno.idx_plan_events_notification;

ALTER TABLE zunno.plan_events
    DROP COLUMN IF EXISTS notified_start_at;

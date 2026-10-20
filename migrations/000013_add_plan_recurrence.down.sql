DROP INDEX IF EXISTS zunno.idx_plan_events_parent;

ALTER TABLE zunno.plan_events
    DROP COLUMN IF EXISTS parent_plan_id,
    DROP COLUMN IF EXISTS recurrence_until,
    DROP COLUMN IF EXISTS recurrence_rule;

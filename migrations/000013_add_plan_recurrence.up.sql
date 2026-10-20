ALTER TABLE zunno.plan_events
    ADD COLUMN recurrence_rule  VARCHAR(20)
        CHECK (recurrence_rule IN ('daily', 'weekly', 'monthly')),
    ADD COLUMN recurrence_until TIMESTAMPTZ,
    ADD COLUMN parent_plan_id   UUID REFERENCES zunno.plan_events(id) ON DELETE CASCADE;

CREATE INDEX idx_plan_events_parent ON zunno.plan_events(parent_plan_id);

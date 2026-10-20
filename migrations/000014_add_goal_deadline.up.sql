ALTER TABLE zunno.goal_categories
    ADD COLUMN due_date         TIMESTAMPTZ,
    ADD COLUMN notified_due_at  TIMESTAMPTZ;

CREATE INDEX idx_goal_categories_due
    ON zunno.goal_categories(due_date)
    WHERE notified_due_at IS NULL AND due_date IS NOT NULL;

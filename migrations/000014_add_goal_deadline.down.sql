DROP INDEX IF EXISTS zunno.idx_goal_categories_due;

ALTER TABLE zunno.goal_categories
    DROP COLUMN IF EXISTS notified_due_at,
    DROP COLUMN IF EXISTS due_date;

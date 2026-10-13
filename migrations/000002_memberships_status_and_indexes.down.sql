DROP INDEX IF EXISTS zunno.idx_plan_events_group_date;
DROP INDEX IF EXISTS zunno.idx_transactions_group_date;
DROP INDEX IF EXISTS zunno.idx_transactions_user_id;
DROP INDEX IF EXISTS zunno.idx_memberships_group_status;
DROP INDEX IF EXISTS zunno.idx_memberships_user_id;

ALTER TABLE zunno.memberships DROP COLUMN IF EXISTS status;
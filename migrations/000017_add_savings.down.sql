ALTER TABLE zunno.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE zunno.transactions ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('income', 'expense'));

ALTER TABLE zunno.transactions DROP COLUMN IF EXISTS savings_goal_id;

DROP INDEX IF EXISTS zunno.idx_savings_goals_group;
DROP TABLE IF EXISTS zunno.savings_goals;

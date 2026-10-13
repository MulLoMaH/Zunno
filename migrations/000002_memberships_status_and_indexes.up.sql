-- Статус участника: pending (приглашён) / active (вступил)
ALTER TABLE zunno.memberships
    ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active'));

-- Существующие участники уже active — default сработал.

-- Индексы под будущие запросы
CREATE INDEX IF NOT EXISTS idx_memberships_user_id
    ON zunno.memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_memberships_group_status
    ON zunno.memberships(group_id, status);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id
    ON zunno.transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_group_date
    ON zunno.transactions(group_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_plan_events_group_date
    ON zunno.plan_events(group_id, event_date);
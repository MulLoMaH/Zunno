-- 1. Таблица копилок
CREATE TABLE IF NOT EXISTS zunno.savings_goals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version        BIGINT NOT NULL DEFAULT 1,
    group_id       UUID NOT NULL REFERENCES zunno.groups(id) ON DELETE CASCADE,
    name           VARCHAR(200) NOT NULL,
    target_amount  NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    icon           VARCHAR(50) NOT NULL DEFAULT 'piggy-bank',
    color          VARCHAR(20),
    is_archived    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_group ON zunno.savings_goals(group_id);

-- 2. Привязка транзакций к копилке
ALTER TABLE zunno.transactions
    ADD COLUMN IF NOT EXISTS savings_goal_id UUID REFERENCES zunno.savings_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_savings_goal
    ON zunno.transactions(savings_goal_id)
    WHERE savings_goal_id IS NOT NULL;

-- 3. Расширяем допустимые типы транзакций
-- Снимаем ЛЮБЫЕ CHECK-констрейнты на колонке type (не угадываем имя)
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'zunno.transactions'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%type%'
    LOOP
        EXECUTE 'ALTER TABLE zunno.transactions DROP CONSTRAINT ' || quote_ident(c.conname);
    END LOOP;
END $$;

ALTER TABLE zunno.transactions
    ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('income', 'expense', 'savings_deposit', 'savings_withdraw'));

CREATE TABLE IF NOT EXISTS zunno.recurring_transactions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id           UUID NOT NULL REFERENCES zunno.groups(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    category_id        UUID REFERENCES zunno.categories(id) ON DELETE SET NULL,
    title              VARCHAR(200) NOT NULL,
    type               VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount             NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    day_of_month       INT NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    last_processed_at  TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_group_id ON zunno.recurring_transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_recurring_day ON zunno.recurring_transactions(day_of_month) WHERE is_active = TRUE;

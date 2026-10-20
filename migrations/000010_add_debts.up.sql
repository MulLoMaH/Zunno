CREATE TABLE IF NOT EXISTS zunno.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES zunno.groups(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES zunno.transactions(id) ON DELETE SET NULL,
    creditor_id UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    debtor_id UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_debts_group_id ON zunno.debts(group_id);
CREATE INDEX IF NOT EXISTS idx_debts_debtor_id ON zunno.debts(debtor_id);

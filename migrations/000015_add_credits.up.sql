CREATE TABLE IF NOT EXISTS zunno.credits (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version        BIGINT NOT NULL DEFAULT 1,
    group_id       UUID NOT NULL REFERENCES zunno.groups(id) ON DELETE CASCADE,
    created_by     UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    name           VARCHAR(200) NOT NULL,
    principal      NUMERIC(15, 2) NOT NULL CHECK (principal > 0),
    annual_rate    NUMERIC(5, 2) NOT NULL CHECK (annual_rate >= 0),
    term_months    INT NOT NULL CHECK (term_months > 0),
    payment_type   VARCHAR(20) NOT NULL DEFAULT 'annuity'
                   CHECK (payment_type IN ('annuity', 'differentiated')),
    start_date     DATE NOT NULL,
    currency       VARCHAR(3) NOT NULL DEFAULT 'RUB',
    is_closed      BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credits_group_id ON zunno.credits(group_id);

CREATE TABLE IF NOT EXISTS zunno.credit_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id       UUID NOT NULL REFERENCES zunno.credits(id) ON DELETE CASCADE,
    transaction_id  UUID REFERENCES zunno.transactions(id) ON DELETE SET NULL,
    amount          NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    principal_part  NUMERIC(15, 2) NOT NULL CHECK (principal_part >= 0),
    interest_part   NUMERIC(15, 2) NOT NULL CHECK (interest_part >= 0),
    payment_date    TIMESTAMPTZ NOT NULL,
    type            VARCHAR(20) NOT NULL DEFAULT 'regular'
                    CHECK (type IN ('regular', 'early')),
    early_recalc    VARCHAR(20)
                    CHECK (early_recalc IN ('reduce_term', 'reduce_payment')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_payments_credit_id ON zunno.credit_payments(credit_id);

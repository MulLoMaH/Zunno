CREATE SCHEMA IF NOT EXISTS zunno;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- Пользователи
-- =============================================
CREATE TABLE IF NOT EXISTS zunno.users (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    version       BIGINT        NOT NULL DEFAULT 1,
    full_name     VARCHAR(100)  NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 100),
    age           INTEGER       NOT NULL,
    phone_number  VARCHAR(15)   NOT NULL UNIQUE CHECK (
        phone_number ~ '^\+[0-9]+$'
        AND char_length(phone_number) BETWEEN 10 AND 15
    ),
    password_hash VARCHAR(255)  NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Группы
-- =============================================
CREATE TABLE IF NOT EXISTS zunno.groups (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version       BIGINT        NOT NULL DEFAULT 1,
    name       VARCHAR(100) NOT NULL,
    owner_id   UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Членство в группах
-- =============================================
CREATE TABLE IF NOT EXISTS zunno.memberships (
    version       BIGINT        NOT NULL DEFAULT 1,
    user_id    UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    group_id   UUID NOT NULL REFERENCES zunno.groups(id) ON DELETE CASCADE,
    role       VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_group_id ON zunno.memberships(group_id);

-- =============================================
-- Категории бюджета
-- =============================================
CREATE TABLE IF NOT EXISTS zunno.categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version       BIGINT        NOT NULL DEFAULT 1,
    group_id   UUID NOT NULL REFERENCES zunno.groups(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    type       VARCHAR(15) NOT NULL CHECK (type IN ('fixed', 'spontaneous')),
    budget_limit      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_group_id ON zunno.categories(group_id);

-- =============================================
-- Транзакции
-- =============================================
CREATE TABLE IF NOT EXISTS zunno.transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version       BIGINT        NOT NULL DEFAULT 1,
    group_id    UUID NOT NULL REFERENCES zunno.groups(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES zunno.categories(id) ON DELETE CASCADE,
    amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date        TIMESTAMPTZ NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_group_id ON zunno.transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON zunno.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON zunno.transactions(date);

-- =============================================
-- Планы и события
-- =============================================
CREATE TABLE IF NOT EXISTS zunno.plan_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version       BIGINT        NOT NULL DEFAULT 1,
    group_id    UUID NOT NULL REFERENCES zunno.groups(id) ON DELETE CASCADE,
    creator_id  UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    event_date  TIMESTAMPTZ NOT NULL,
    is_done     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    done_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_plan_events_group_id ON zunno.plan_events(group_id);
CREATE INDEX IF NOT EXISTS idx_plan_events_event_date ON zunno.plan_events(event_date);

-- =============================================
-- Чек-листы
-- =============================================
CREATE TABLE IF NOT EXISTS zunno.checklist_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version       BIGINT        NOT NULL DEFAULT 1,
    event_id   UUID NOT NULL REFERENCES zunno.plan_events(id) ON DELETE CASCADE,
    text       VARCHAR(500) NOT NULL,
    is_checked BOOLEAN NOT NULL DEFAULT FALSE,
    checked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_event_id ON zunno.checklist_items(event_id);

-- =============================================
-- Категории целей
-- =============================================
CREATE TABLE IF NOT EXISTS zunno.goal_categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version       BIGINT        NOT NULL DEFAULT 1,
    group_id   UUID NOT NULL REFERENCES zunno.groups(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_goal_categories_group_id ON zunno.goal_categories(group_id);

-- =============================================
-- Элементы целей
-- =============================================
CREATE TABLE IF NOT EXISTS zunno.goal_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version       BIGINT        NOT NULL DEFAULT 1,
    category_id UUID NOT NULL REFERENCES zunno.goal_categories(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    done        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    done_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_goal_items_category_id ON zunno.goal_items(category_id);

-- =============================================
-- Статистика (материализованная)
-- =============================================
CREATE TABLE IF NOT EXISTS zunno.category_stats (
    version       BIGINT        NOT NULL DEFAULT 1,
    group_id     UUID NOT NULL REFERENCES zunno.groups(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    category_id  UUID NOT NULL REFERENCES zunno.categories(id) ON DELETE CASCADE,
    month        VARCHAR(7) NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id, category_id, month)
);

CREATE INDEX IF NOT EXISTS idx_category_stats_month ON zunno.category_stats(month);
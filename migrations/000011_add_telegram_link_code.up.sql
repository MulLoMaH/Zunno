ALTER TABLE zunno.users
    ADD COLUMN telegram_link_code VARCHAR(16),
    ADD COLUMN telegram_link_code_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX idx_users_telegram_link_code
    ON zunno.users (telegram_link_code)
    WHERE telegram_link_code IS NOT NULL;

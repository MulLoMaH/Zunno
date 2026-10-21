DROP INDEX IF EXISTS zunno.idx_users_telegram_link_code;

ALTER TABLE zunno.users
    DROP COLUMN IF EXISTS telegram_link_code,
    DROP COLUMN IF EXISTS telegram_link_code_expires_at;

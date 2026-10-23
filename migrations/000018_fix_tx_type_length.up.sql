-- Расширяем колонку type, чтобы влезли savings_deposit и savings_withdraw
ALTER TABLE zunno.transactions ALTER COLUMN type TYPE VARCHAR(30);

-- Возвращаем назад (осторожно, упадёт, если есть savings-транзакции)
ALTER TABLE zunno.transactions ALTER COLUMN type TYPE VARCHAR(10);

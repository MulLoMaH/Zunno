ALTER TABLE zunno.users 
ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'RUB' 
CHECK (currency IN ('RUB', 'USD', 'EUR', 'KZT', 'BYN'));

ALTER TABLE zunno.transactions 
ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'expense' 
CHECK (type IN ('income', 'expense'));

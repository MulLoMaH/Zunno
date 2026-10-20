ALTER TABLE zunno.memberships ADD COLUMN invited_by UUID REFERENCES zunno.users(id) ON DELETE SET NULL;

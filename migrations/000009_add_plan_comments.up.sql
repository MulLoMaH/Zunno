CREATE TABLE IF NOT EXISTS zunno.plan_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES zunno.plan_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    text VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_plan_comments_event_id ON zunno.plan_comments(event_id);

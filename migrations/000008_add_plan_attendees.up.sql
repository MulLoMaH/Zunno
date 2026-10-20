CREATE TABLE IF NOT EXISTS zunno.plan_attendees (
    event_id UUID NOT NULL REFERENCES zunno.plan_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES zunno.users(id) ON DELETE CASCADE,
    status VARCHAR(15) NOT NULL CHECK (status IN ('going', 'not_going', 'maybe')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
);

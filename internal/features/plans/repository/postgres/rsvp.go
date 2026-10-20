package plans_postgres_repository

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (r *PlansRepository) SetRSVP(ctx context.Context, eventID, userID uuid.UUID, status string) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.plan_attendees (event_id, user_id, status)
		VALUES ($1, $2, $3)
		ON CONFLICT (event_id, user_id) 
		DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
	`
	_, err := r.pool.Exec(ctx, query, eventID, userID, status)
	if err != nil {
		return fmt.Errorf("set rsvp: %w", err)
	}
	return nil
}

func (r *PlansRepository) GetRSVPs(ctx context.Context, eventID uuid.UUID) ([]domain.PlanAttendee, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `SELECT event_id, user_id, status, updated_at FROM zunno.plan_attendees WHERE event_id = $1`
	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("query rsvps: %w", err)
	}
	defer rows.Close()

	var attendees []domain.PlanAttendee
	for rows.Next() {
		var a domain.PlanAttendee
		if err := rows.Scan(&a.EventID, &a.UserID, &a.Status, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan rsvp: %w", err)
		}
		attendees = append(attendees, a)
	}
	return attendees, nil
}

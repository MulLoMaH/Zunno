package plans_postgres_repository

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (r *PlansRepository) CreateComment(ctx context.Context, eventID, userID uuid.UUID, text string) (domain.PlanComment, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.plan_comments (event_id, user_id, text)
		VALUES ($1, $2, $3)
		RETURNING id, event_id, user_id, text, created_at
	`
	var c domain.PlanComment
	err := r.pool.QueryRow(ctx, query, eventID, userID, text).Scan(
		&c.ID, &c.EventID, &c.UserID, &c.Text, &c.CreatedAt,
	)
	if err != nil {
		return domain.PlanComment{}, fmt.Errorf("create comment: %w", err)
	}
	return c, nil
}

func (r *PlansRepository) GetComments(ctx context.Context, eventID uuid.UUID) ([]domain.PlanComment, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT c.id, c.event_id, c.user_id, u.full_name, c.text, c.created_at
		FROM zunno.plan_comments c
		JOIN zunno.users u ON u.id = c.user_id
		WHERE c.event_id = $1
		ORDER BY c.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("query comments: %w", err)
	}
	defer rows.Close()

	var comments []domain.PlanComment
	for rows.Next() {
		var c domain.PlanComment
		if err := rows.Scan(&c.ID, &c.EventID, &c.UserID, &c.FullName, &c.Text, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		comments = append(comments, c)
	}
	return comments, nil
}

package plans_postgres_repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

func (r *PlansRepository) CreatePlan(ctx context.Context, p domain.PlanEvent) (domain.PlanEvent, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.plan_events (group_id, creator_id, title, description, event_date)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, version, group_id, creator_id, title, description, event_date, is_done, created_at, done_at
	`
	var m PlanModel
	err := r.pool.QueryRow(ctx, query, p.GroupID, p.CreatorID, p.Title, p.Description, p.EventDate).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.CreatorID, &m.Title, &m.Description,
		&m.EventDate, &m.IsDone, &m.CreatedAt, &m.DoneAt,
	)
	if err != nil {
		return domain.PlanEvent{}, fmt.Errorf("create plan: %w", err)
	}
	return planFromModel(m), nil
}

func (r *PlansRepository) GetPlans(
	ctx context.Context,
	groupID uuid.UUID,
	from, to time.Time,
) ([]domain.PlanEvent, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, creator_id, title, description, event_date, is_done, created_at, done_at
		FROM zunno.plan_events
		WHERE group_id = $1 AND event_date >= $2 AND event_date <= $3
		ORDER BY event_date ASC
	`
	rows, err := r.pool.Query(ctx, query, groupID, from, to)
	if err != nil {
		return nil, fmt.Errorf("query plans: %w", err)
	}
	defer rows.Close()

	var plans []domain.PlanEvent
	for rows.Next() {
		var m PlanModel
		if err := rows.Scan(
			&m.ID, &m.Version, &m.GroupID, &m.CreatorID, &m.Title, &m.Description,
			&m.EventDate, &m.IsDone, &m.CreatedAt, &m.DoneAt,
		); err != nil {
			return nil, fmt.Errorf("scan plan: %w", err)
		}
		plans = append(plans, planFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate plans: %w", err)
	}
	return plans, nil
}

func (r *PlansRepository) GetPlan(ctx context.Context, planID uuid.UUID) (domain.PlanEvent, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, creator_id, title, description, event_date, is_done, created_at, done_at
		FROM zunno.plan_events
		WHERE id = $1
	`
	var m PlanModel
	err := r.pool.QueryRow(ctx, query, planID).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.CreatorID, &m.Title, &m.Description,
		&m.EventDate, &m.IsDone, &m.CreatedAt, &m.DoneAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.PlanEvent{}, core_errors.ErrPlanNotFound
		}
		return domain.PlanEvent{}, fmt.Errorf("get plan: %w", err)
	}
	return planFromModel(m), nil
}

func (r *PlansRepository) UpdatePlan(
	ctx context.Context,
	planID uuid.UUID,
	title, description string,
	eventDate time.Time,
	isDone bool,
	expectedVersion int64,
) (domain.PlanEvent, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.plan_events
		SET title       = $1,
		    description = $2,
		    event_date  = $3,
		    is_done     = $4,
		    done_at     = CASE WHEN $4 THEN COALESCE(done_at, now()) ELSE NULL END,
		    version     = version + 1
		WHERE id = $5 AND version = $6
		RETURNING id, version, group_id, creator_id, title, description, event_date, is_done, created_at, done_at
	`
	var m PlanModel
	err := r.pool.QueryRow(ctx, query, title, description, eventDate, isDone, planID, expectedVersion).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.CreatorID, &m.Title, &m.Description,
		&m.EventDate, &m.IsDone, &m.CreatedAt, &m.DoneAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.PlanEvent{}, core_errors.ErrConflict
		}
		return domain.PlanEvent{}, fmt.Errorf("update plan: %w", err)
	}
	return planFromModel(m), nil
}

func (r *PlansRepository) DeletePlan(ctx context.Context, planID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx, `DELETE FROM zunno.plan_events WHERE id = $1`, planID)
	if err != nil {
		return fmt.Errorf("delete plan: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrPlanNotFound
	}
	return nil
}

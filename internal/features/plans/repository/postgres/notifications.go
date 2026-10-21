package plans_postgres_repository

import (
	"context"
	"fmt"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

// ListPlansForNotification — события, которые ещё не уведомлены и стартуют
// в окне [now, now+window]. is_done=false — не напоминаем по прошедшим.
func (r *PlansRepository) ListPlansForNotification(
	ctx context.Context,
	window time.Duration,
) ([]domain.PlanEvent, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, creator_id, title, description,
		       event_date, is_done, created_at, done_at
		FROM zunno.plan_events
		WHERE notified_start_at IS NULL
		  AND is_done = false
		  AND event_date BETWEEN NOW() AND NOW() + $1::interval
		ORDER BY event_date ASC
	`
	rows, err := r.pool.Query(ctx, query, window.String())
	if err != nil {
		return nil, fmt.Errorf("list plans for notification: %w", err)
	}
	defer rows.Close()

	var plans []domain.PlanEvent
	for rows.Next() {
		var p domain.PlanEvent
		if err := rows.Scan(
			&p.ID, &p.Version, &p.GroupID, &p.CreatorID,
			&p.Title, &p.Description, &p.EventDate,
			&p.IsDone, &p.CreatedAt, &p.DoneAt,
		); err != nil {
			return nil, fmt.Errorf("scan plan: %w", err)
		}
		plans = append(plans, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate plans: %w", err)
	}
	return plans, nil
}

// MarkPlanNotified — ставит флаг, что напоминание отправлено.
// Идемпотентно: WHERE notified_start_at IS NULL защищает от гонок.
func (r *PlansRepository) MarkPlanNotified(ctx context.Context, planID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.plan_events
		SET notified_start_at = NOW()
		WHERE id = $1 AND notified_start_at IS NULL
	`
	_, err := r.pool.Exec(ctx, query, planID)
	if err != nil {
		return fmt.Errorf("mark plan notified: %w", err)
	}
	return nil
}

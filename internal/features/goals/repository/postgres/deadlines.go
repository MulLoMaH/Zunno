package goals_postgres_repository

import (
	"context"
	"fmt"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

// SetGoalCategoryDueDate — ставит/снимает дедлайн. Сбрасывает notified_due_at,
// чтобы при новом дедлайне напоминание пришло заново.
func (r *GoalsRepository) SetGoalCategoryDueDate(
	ctx context.Context,
	categoryID uuid.UUID,
	dueDate *time.Time,
) (domain.GoalCategory, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.goal_categories
		SET due_date        = $1,
		    notified_due_at = NULL,
		    version         = version + 1
		WHERE id = $2
		RETURNING id, version, group_id, name, position, due_date, notified_due_at
	`
	var m GoalCategoryModel
	err := r.pool.QueryRow(ctx, query, dueDate, categoryID).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.Name, &m.Position,
		&m.DueDate, &m.NotifiedDueAt,
	)
	if err != nil {
		return domain.GoalCategory{}, fmt.Errorf("set due date: %w", err)
	}
	return categoryFromModel(m), nil
}

// ListGoalCategoriesForNotification — дедлайн в окне [now, now+window], ещё не уведомлено.
func (r *GoalsRepository) ListGoalCategoriesForNotification(
	ctx context.Context,
	window time.Duration,
) ([]domain.GoalCategory, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, name, position, due_date, notified_due_at
		FROM zunno.goal_categories
		WHERE due_date IS NOT NULL
		  AND notified_due_at IS NULL
		  AND due_date BETWEEN NOW() AND NOW() + $1::interval
		ORDER BY due_date ASC
	`
	rows, err := r.pool.Query(ctx, query, window.String())
	if err != nil {
		return nil, fmt.Errorf("list goal categories for notification: %w", err)
	}
	defer rows.Close()

	var cats []domain.GoalCategory
	for rows.Next() {
		var m GoalCategoryModel
		if err := rows.Scan(
			&m.ID, &m.Version, &m.GroupID, &m.Name, &m.Position,
			&m.DueDate, &m.NotifiedDueAt,
		); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		cats = append(cats, categoryFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate categories: %w", err)
	}
	return cats, nil
}

// GetGoalCategoryProgress — (done, total) по пунктам категории.
func (r *GoalsRepository) GetGoalCategoryProgress(
	ctx context.Context,
	categoryID uuid.UUID,
) (done, total int, err error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT
		    COALESCE(SUM(CASE WHEN done THEN 1 ELSE 0 END), 0)::int,
		    COUNT(*)::int
		FROM zunno.goal_items
		WHERE category_id = $1
	`
	if err := r.pool.QueryRow(ctx, query, categoryID).Scan(&done, &total); err != nil {
		return 0, 0, fmt.Errorf("get goal progress: %w", err)
	}
	return done, total, nil
}

// MarkGoalCategoryNotified — флаг «напоминание отправлено».
func (r *GoalsRepository) MarkGoalCategoryNotified(ctx context.Context, categoryID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `UPDATE zunno.goal_categories SET notified_due_at = NOW() WHERE id = $1`
	if _, err := r.pool.Exec(ctx, query, categoryID); err != nil {
		return fmt.Errorf("mark goal notified: %w", err)
	}
	return nil
}

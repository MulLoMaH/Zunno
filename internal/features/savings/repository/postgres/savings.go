package savings_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
	"github.com/google/uuid"
)

func (r *SavingsRepository) CreateGoal(ctx context.Context, g domain.SavingsGoal) (domain.SavingsGoal, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.savings_goals (group_id, name, target_amount, current_amount, icon, color)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, version, group_id, name, target_amount, current_amount, icon, color, is_archived, created_at, updated_at
	`
	var m SavingsModel
	err := r.pool.QueryRow(ctx, query,
		g.GroupID, g.Name, g.TargetAmount, g.CurrentAmount, g.Icon, g.Color,
	).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.Name, &m.TargetAmount, &m.CurrentAmount,
		&m.Icon, &m.Color, &m.IsArchived, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return domain.SavingsGoal{}, fmt.Errorf("create savings goal: %w", err)
	}
	return savingsFromModel(m), nil
}

func (r *SavingsRepository) ListGoals(ctx context.Context, groupID uuid.UUID) ([]domain.SavingsGoal, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, name, target_amount, current_amount, icon, color, is_archived, created_at, updated_at
		FROM zunno.savings_goals
		WHERE group_id = $1 AND is_archived = FALSE
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("list savings goals: %w", err)
	}
	defer rows.Close()

	var goals []domain.SavingsGoal
	for rows.Next() {
		var m SavingsModel
		if err := rows.Scan(
			&m.ID, &m.Version, &m.GroupID, &m.Name, &m.TargetAmount, &m.CurrentAmount,
			&m.Icon, &m.Color, &m.IsArchived, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan savings goal: %w", err)
		}
		goals = append(goals, savingsFromModel(m))
	}
	return goals, nil
}

func (r *SavingsRepository) GetGoal(ctx context.Context, id uuid.UUID) (domain.SavingsGoal, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, name, target_amount, current_amount, icon, color, is_archived, created_at, updated_at
		FROM zunno.savings_goals
		WHERE id = $1
	`
	var m SavingsModel
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.Name, &m.TargetAmount, &m.CurrentAmount,
		&m.Icon, &m.Color, &m.IsArchived, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.SavingsGoal{}, core_errors.ErrInvalidArgument // Можно добавить ErrSavingsNotFound
		}
		return domain.SavingsGoal{}, fmt.Errorf("get savings goal: %w", err)
	}
	return savingsFromModel(m), nil
}

func (r *SavingsRepository) UpdateGoalAmount(ctx context.Context, id uuid.UUID, newAmount float64) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.savings_goals
		SET current_amount = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.pool.Exec(ctx, query, newAmount, id)
	if err != nil {
		return fmt.Errorf("update savings amount: %w", err)
	}
	return nil
}

func (r *SavingsRepository) DeleteGoal(ctx context.Context, id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx, `DELETE FROM zunno.savings_goals WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete savings goal: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrInvalidArgument
	}
	return nil
}

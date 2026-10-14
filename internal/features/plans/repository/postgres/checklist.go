package plans_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

func (r *PlansRepository) CreateChecklistItem(ctx context.Context, c domain.ChecklistItem) (domain.ChecklistItem, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.checklist_items (event_id, text)
		VALUES ($1, $2)
		RETURNING id, version, event_id, text, is_checked, checked_at
	`
	var m ChecklistModel
	err := r.pool.QueryRow(ctx, query, c.EventID, c.Text).Scan(
		&m.ID, &m.Version, &m.EventID, &m.Text, &m.IsChecked, &m.CheckedAt,
	)
	if err != nil {
		return domain.ChecklistItem{}, fmt.Errorf("create checklist: %w", err)
	}
	return checklistFromModel(m), nil
}

func (r *PlansRepository) GetChecklist(ctx context.Context, eventID uuid.UUID) ([]domain.ChecklistItem, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, event_id, text, is_checked, checked_at
		FROM zunno.checklist_items
		WHERE event_id = $1
		ORDER BY id ASC
	`
	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("query checklist: %w", err)
	}
	defer rows.Close()

	var items []domain.ChecklistItem
	for rows.Next() {
		var m ChecklistModel
		if err := rows.Scan(&m.ID, &m.Version, &m.EventID, &m.Text, &m.IsChecked, &m.CheckedAt); err != nil {
			return nil, fmt.Errorf("scan checklist: %w", err)
		}
		items = append(items, checklistFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate checklist: %w", err)
	}
	return items, nil
}

func (r *PlansRepository) GetChecklistItem(ctx context.Context, itemID uuid.UUID) (domain.ChecklistItem, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, event_id, text, is_checked, checked_at
		FROM zunno.checklist_items
		WHERE id = $1
	`
	var m ChecklistModel
	err := r.pool.QueryRow(ctx, query, itemID).Scan(
		&m.ID, &m.Version, &m.EventID, &m.Text, &m.IsChecked, &m.CheckedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.ChecklistItem{}, core_errors.ErrChecklistNotFound
		}
		return domain.ChecklistItem{}, fmt.Errorf("get checklist item: %w", err)
	}
	return checklistFromModel(m), nil
}

func (r *PlansRepository) UpdateChecklistItem(
	ctx context.Context,
	itemID uuid.UUID,
	text string,
	isChecked bool,
	expectedVersion int64,
) (domain.ChecklistItem, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.checklist_items
		SET text       = $1,
		    is_checked = $2,
		    checked_at = CASE WHEN $2 THEN COALESCE(checked_at, now()) ELSE NULL END,
		    version    = version + 1
		WHERE id = $3 AND version = $4
		RETURNING id, version, event_id, text, is_checked, checked_at
	`
	var m ChecklistModel
	err := r.pool.QueryRow(ctx, query, text, isChecked, itemID, expectedVersion).Scan(
		&m.ID, &m.Version, &m.EventID, &m.Text, &m.IsChecked, &m.CheckedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.ChecklistItem{}, core_errors.ErrConflict
		}
		return domain.ChecklistItem{}, fmt.Errorf("update checklist: %w", err)
	}
	return checklistFromModel(m), nil
}

func (r *PlansRepository) DeleteChecklistItem(ctx context.Context, itemID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx, `DELETE FROM zunno.checklist_items WHERE id = $1`, itemID)
	if err != nil {
		return fmt.Errorf("delete checklist: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrChecklistNotFound
	}
	return nil
}

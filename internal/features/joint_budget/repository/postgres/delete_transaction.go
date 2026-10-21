package budget_postgres_repository

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (r *BudgetRepository) DeleteTransaction(ctx context.Context, groupID, txID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx,
		`DELETE FROM zunno.transactions WHERE id = $1 AND group_id = $2`,
		txID, groupID,
	)
	if err != nil {
		return fmt.Errorf("delete transaction: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrTransactionNotFound
	}
	return nil
}

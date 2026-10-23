package recurring_postgres_repository

import (
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

type RecurringRepository struct {
	pool core_postgres_pool.Pool
}

func NewRecurringRepository(pool core_postgres_pool.Pool) *RecurringRepository {
	return &RecurringRepository{pool: pool}
}

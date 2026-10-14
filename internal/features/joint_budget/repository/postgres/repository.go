package budget_postgres_repository

import (
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

type BudgetRepository struct {
	pool core_postgres_pool.Pool
}

func NewBudgetRepository(pool core_postgres_pool.Pool) *BudgetRepository {
	return &BudgetRepository{pool: pool}
}

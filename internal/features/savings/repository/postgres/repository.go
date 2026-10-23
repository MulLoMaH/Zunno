package savings_postgres_repository

import (
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

type SavingsRepository struct {
	pool core_postgres_pool.Pool
}

func NewSavingsRepository(pool core_postgres_pool.Pool) *SavingsRepository {
	return &SavingsRepository{pool: pool}
}

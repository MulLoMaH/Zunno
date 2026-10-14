package goals_postgres_repository

import (
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

type GoalsRepository struct {
	pool core_postgres_pool.Pool
}

func NewGoalsRepository(pool core_postgres_pool.Pool) *GoalsRepository {
	return &GoalsRepository{pool: pool}
}

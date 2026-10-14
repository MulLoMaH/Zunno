package plans_postgres_repository

import (
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

type PlansRepository struct {
	pool core_postgres_pool.Pool
}

func NewPlansRepository(pool core_postgres_pool.Pool) *PlansRepository {
	return &PlansRepository{pool: pool}
}

package groups_postgres_repository

import (
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

type GroupsRepository struct {
	pool core_postgres_pool.Pool
}

func NewGroupsRepository(pool core_postgres_pool.Pool) *GroupsRepository {
	return &GroupsRepository{pool: pool}
}

package users_postgres_repository

import core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"

type UsersRepository struct {
	pool core_postgres_pool.Pool
}

func NewUsersRepository(pool core_postgres_pool.Pool) *UsersRepository {
	return &UsersRepository{
		pool: pool,
	}
}

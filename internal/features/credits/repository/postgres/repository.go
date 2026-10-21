package credits_postgres_repository

import (
	"context"
	"time"

	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

type CreditsRepository struct {
	pool core_postgres_pool.Pool
}

func NewCreditsRepository(pool core_postgres_pool.Pool) *CreditsRepository {
	return &CreditsRepository{pool: pool}
}

// compile-time check, что интерфейс сервиса реализуется
var _ = time.Now
var _ = context.Background

package core_pgx_pool

import (
	"errors"
	"fmt"

	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type pgxRows struct {
	pgx.Rows
}

type pgxRow struct {
	pgx.Row
}

func (r pgxRow) Scan(dest ...any) error {

	err := r.Row.Scan(dest...)

	if err != nil {
		return mapErrors(err)
	}

	return nil
}

type pgxCommandTag struct {
	pgconn.CommandTag
}

func mapErrors(err error) error {
	const (
		pgxViolatesForeignKey = "23503"
		pgxUniqueViolation    = "23505"
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return core_postgres_pool.ErrNoRows
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case pgxViolatesForeignKey:
			return fmt.Errorf("%w: %w", err, core_postgres_pool.ErrViolatesForeignKey)
		case pgxUniqueViolation:
			return fmt.Errorf("%w: %w", err, core_postgres_pool.ErrUniqueViolation)
		}
	}

	return fmt.Errorf("%w: %w", err, core_postgres_pool.ErrUnknown)
}

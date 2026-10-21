package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
	"github.com/google/uuid"
)

// SetTelegramChatID — привязывает chat_id к пользователю и очищает link-код.
func (r *UsersRepository) SetTelegramChatID(ctx context.Context, userID uuid.UUID, chatID int64) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.users
		SET telegram_chat_id            = $1,
		    telegram_link_code          = NULL,
		    telegram_link_code_expires_at = NULL
		WHERE id = $2
	`
	tag, err := r.pool.Exec(ctx, query, chatID, userID)
	if err != nil {
		return fmt.Errorf("set telegram chat id: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrUserNotFound
	}
	return nil
}

// ClearTelegramChatID — отвязывает Telegram.
func (r *UsersRepository) ClearTelegramChatID(ctx context.Context, userID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `UPDATE zunno.users SET telegram_chat_id = NULL WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("clear telegram chat id: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrUserNotFound
	}
	return nil
}

// SetTelegramLinkCode — сохраняет одноразовый код привязки с TTL.
func (r *UsersRepository) SetTelegramLinkCode(ctx context.Context, userID uuid.UUID, code string, expiresAt time.Time) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.users
		SET telegram_link_code            = $1,
		    telegram_link_code_expires_at = $2
		WHERE id = $3
	`
	tag, err := r.pool.Exec(ctx, query, code, expiresAt, userID)
	if err != nil {
		return fmt.Errorf("set telegram link code: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrUserNotFound
	}
	return nil
}

// FindByTelegramLinkCode — ищет user_id по действующему (не истёкшему) коду.
func (r *UsersRepository) FindByTelegramLinkCode(ctx context.Context, code string) (uuid.UUID, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id
		FROM zunno.users
		WHERE telegram_link_code = $1
		  AND telegram_link_code_expires_at > NOW()
	`
	var userID uuid.UUID
	err := r.pool.QueryRow(ctx, query, code).Scan(&userID)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return uuid.UUID{}, core_errors.ErrUserNotFound
		}
		return uuid.UUID{}, fmt.Errorf("find by link code: %w", err)
	}
	return userID, nil
}

package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
	"github.com/google/uuid"
)

// GetUserTelegramChatID возвращает chat_id и флаг «привязан ли Telegram».
// Если user_id нет в БД — вернёт ошибку. Если юзер есть, но chat_id NULL —
// вернёт (0, false, nil) — это нормальный сценарий «не привязан».
func (r *UsersRepository) GetUserTelegramChatID(
	ctx context.Context,
	userID uuid.UUID,
) (int64, bool, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `SELECT telegram_chat_id FROM zunno.users WHERE id = $1`

	var chatID *int64
	err := r.pool.QueryRow(ctx, query, userID).Scan(&chatID)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return 0, false, fmt.Errorf("user not found: %w", err)
		}
		return 0, false, fmt.Errorf("get telegram chat id: %w", err)
	}
	if chatID == nil {
		return 0, false, nil
	}
	return *chatID, true, nil
}

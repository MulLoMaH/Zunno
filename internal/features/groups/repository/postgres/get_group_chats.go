package groups_postgres_repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

func (r *GroupsRepository) GetGroupTelegramChatIDs(ctx context.Context, groupID uuid.UUID) ([]int64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT u.telegram_chat_id
		FROM zunno.memberships m
		JOIN zunno.users u ON u.id = m.user_id
		WHERE m.group_id = $1 
		  AND m.status = 'active' 
		  AND u.telegram_chat_id IS NOT NULL
	`

	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("query group chats: %w", err)
	}
	defer rows.Close()

	var chats []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan chat id: %w", err)
		}
		chats = append(chats, id)
	}
	return chats, nil
}

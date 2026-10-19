package groups_postgres_repository

import (
    "context"
    "fmt"

    "github.com/MulLoMaH/Zunno/internal/core/domain"
    "github.com/google/uuid"
)

func (r *GroupsRepository) GetGroupMembers(
    ctx context.Context,
    groupID uuid.UUID,
) ([]domain.GroupMember, error) {
    ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
    defer cancel()

    query := `
        SELECT
            m.user_id,
            m.group_id,
            m.role,
            m.status,
            m.joined_at,
            u.full_name,
            u.phone_number
        FROM zunno.memberships m
        JOIN zunno.users u ON u.id = m.user_id
        WHERE m.group_id = $1 AND m.status = 'active'
        ORDER BY m.joined_at ASC
    `

    rows, err := r.pool.Query(ctx, query, groupID)
    if err != nil {
        return nil, fmt.Errorf("query members: %w", err)
    }
    defer rows.Close()

    var members []domain.GroupMember
    for rows.Next() {
        var m domain.GroupMember
        if err := rows.Scan(
            &m.UserID,
            &m.GroupID,
            &m.Role,
            &m.Status,
            &m.JoinedAt,
            &m.FullName,
            &m.PhoneNumber,
        ); err != nil {
            return nil, fmt.Errorf("scan member: %w", err)
        }
        members = append(members, m)
    }
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("iterate members: %w", err)
    }

    return members, nil
}

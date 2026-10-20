package group_service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// notifyInvitation отправляет приглашённому push в Telegram.
// Тихо выходит, если приглашённый не привязал Telegram или бот не настроен.
func (s *GroupService) notifyInvitation(
	ctx context.Context,
	inviteeID, inviterID, groupID uuid.UUID,
) {
	if s.tg == nil {
		return
	}

	chatID, ok, err := s.users.GetUserTelegramChatID(ctx, inviteeID)
	if err != nil || !ok {
		return
	}

	inviter, err := s.users.GetUser(ctx, inviterID)
	if err != nil {
		return
	}

	group, err := s.groups.GetGroup(ctx, groupID)
	if err != nil {
		return
	}

	msg := fmt.Sprintf(
		"👥 <b>Вас пригласили в группу</b>\n\n📁 %s\n👤 Приглашение от: %s\n\nОткройте Zunno, чтобы принять или отклонить.",
		group.Name,
		inviter.FullName,
	)

	if err := s.tg.SendMessage(ctx, chatID, msg); err != nil {
		s.logger.Info("invite notify: send failed",
			zap.Int64("chat_id", chatID),
			zap.Error(err),
		)
	}
}

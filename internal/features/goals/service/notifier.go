package goal_service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	"github.com/MulLoMaH/Zunno/internal/core/telegram"
)

const (
	goalNotificationWindow = 24 * time.Hour
	goalNotificationTick   = 6 * time.Hour
)

type GoalNotifierRepository interface {
	ListGoalCategoriesForNotification(ctx context.Context, window time.Duration) ([]domain.GoalCategory, error)
	GetGoalCategoryProgress(ctx context.Context, categoryID uuid.UUID) (done, total int, err error)
	MarkGoalCategoryNotified(ctx context.Context, categoryID uuid.UUID) error
}

type GoalNotifierGroupsRepository interface {
	GetGroupTelegramChatIDs(ctx context.Context, groupID uuid.UUID) ([]int64, error)
}

type GoalNotifier struct {
	goals  GoalNotifierRepository
	groups GoalNotifierGroupsRepository
	tg     *telegram.Client
	logger *core_logger.Logger
}

func NewGoalNotifier(
	goals GoalNotifierRepository,
	groups GoalNotifierGroupsRepository,
	tg *telegram.Client,
	logger *core_logger.Logger,
) *GoalNotifier {
	return &GoalNotifier{goals: goals, groups: groups, tg: tg, logger: logger}
}

func (n *GoalNotifier) Run(ctx context.Context) {
	if n.tg == nil {
		return
	}
	ticker := time.NewTicker(goalNotificationTick)
	defer ticker.Stop()

	n.notifyOnce(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			n.notifyOnce(ctx)
		}
	}
}

func (n *GoalNotifier) notifyOnce(ctx context.Context) {
	cats, err := n.goals.ListGoalCategoriesForNotification(ctx, goalNotificationWindow)
	if err != nil {
		n.logger.Error("goal notifier: list", zap.Error(err))
		return
	}
	for _, cat := range cats {
		if err := n.notifyCategory(ctx, cat); err != nil {
			n.logger.Error("goal notifier: notify",
				zap.String("category_id", cat.ID.String()),
				zap.Error(err),
			)
			continue
		}
		if err := n.goals.MarkGoalCategoryNotified(ctx, cat.ID); err != nil {
			n.logger.Error("goal notifier: mark",
				zap.String("category_id", cat.ID.String()),
				zap.Error(err),
			)
		}
	}
}

func (n *GoalNotifier) notifyCategory(ctx context.Context, cat domain.GoalCategory) error {
	chats, err := n.groups.GetGroupTelegramChatIDs(ctx, cat.GroupID)
	if err != nil {
		return fmt.Errorf("get chats: %w", err)
	}
	if len(chats) == 0 {
		return nil
	}

	done, total, err := n.goals.GetGoalCategoryProgress(ctx, cat.ID)
	if err != nil {
		n.logger.Info("goal notifier: progress", zap.Error(err))
	}

	var progress string
	if total > 0 {
		pct := done * 100 / total
		progress = fmt.Sprintf("\n📊 Прогресс: %d / %d (%d%%)", done, total, pct)
	}

	due := "—"
	if cat.DueDate != nil {
		due = cat.DueDate.Format("02.01.2006")
	}

	msg := fmt.Sprintf(
		"⏰ <b>Дедлайн цели</b>\n\n📁 %s\n🗓 До: %s%s",
		cat.Name, due, progress,
	)

	for _, chatID := range chats {
		if err := n.tg.SendMessage(ctx, chatID, msg); err != nil {
			n.logger.Info("goal notifier: send",
				zap.Int64("chat_id", chatID),
				zap.Error(err),
			)
		}
	}
	return nil
}

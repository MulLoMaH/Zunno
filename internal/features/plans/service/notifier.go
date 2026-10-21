package plan_service

import (
	"context"
	"fmt"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	"github.com/MulLoMaH/Zunno/internal/core/telegram"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

const (
	// Окно напоминания — за 24 часа до события.
	notificationWindow = 24 * time.Hour
	// Период опроса — раз в 5 минут. 24h / 5min = 288 проверок в сутки,
	// нормально для одного SELECT с частичным индексом.
	notificationTick = 5 * time.Minute
)

// PlanNotifierRepository — узкий интерфейс, чтобы не тащить весь PlansRepository.
type PlanNotifierRepository interface {
	ListPlansForNotification(ctx context.Context, window time.Duration) ([]domain.PlanEvent, error)
	MarkPlanNotified(ctx context.Context, planID uuid.UUID) error
}

type PlanGroupsRepository interface {
	GetGroupTelegramChatIDs(ctx context.Context, groupID uuid.UUID) ([]int64, error)
}

type PlanNotifier struct {
	plans  PlanNotifierRepository
	groups PlanGroupsRepository
	tg     *telegram.Client
	logger *core_logger.Logger
}

func NewPlanNotifier(
	plans PlanNotifierRepository,
	groups PlanGroupsRepository,
	tg *telegram.Client,
	logger *core_logger.Logger,
) *PlanNotifier {
	return &PlanNotifier{plans: plans, groups: groups, tg: tg, logger: logger}
}

// Run блокирует горутину до отмены ctx. Тикер — раз в 5 минут.
// Первый тик — сразу при старте (чтобы не ждать 5 минут после перезапуска).
func (n *PlanNotifier) Run(ctx context.Context) {
	if n.tg == nil {
		return
	}

	ticker := time.NewTicker(notificationTick)
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

func (n *PlanNotifier) notifyOnce(ctx context.Context) {
	plans, err := n.plans.ListPlansForNotification(ctx, notificationWindow)
	if err != nil {
		n.logger.Error("plan notifier: list plans", zap.Error(err))
		return
	}
	for _, p := range plans {
		if err := n.notifyPlan(ctx, p); err != nil {
			n.logger.Error("plan notifier: notify plan",
				zap.String("plan_id", p.ID.String()),
				zap.Error(err),
			)
			continue
		}
		if err := n.plans.MarkPlanNotified(ctx, p.ID); err != nil {
			n.logger.Error("plan notifier: mark notified",
				zap.String("plan_id", p.ID.String()),
				zap.Error(err),
			)
		}
	}
}

func (n *PlanNotifier) notifyPlan(ctx context.Context, p domain.PlanEvent) error {
	chats, err := n.groups.GetGroupTelegramChatIDs(ctx, p.GroupID)
	if err != nil {
		return fmt.Errorf("get chats: %w", err)
	}
	if len(chats) == 0 {
		return nil
	}

	localTime := p.EventDate.Format("02.01 15:04")
	msg := fmt.Sprintf(
		"📅 <b>Напоминание о событии</b>\n\n🕒 %s\n📌 %s",
		localTime, p.Title,
	)
	if p.Description != "" {
		msg += "\n\n" + p.Description
	}

	for _, chatID := range chats {
		if err := n.tg.SendMessage(ctx, chatID, msg); err != nil {
			n.logger.Info("plan notifier: send failed",
				zap.Int64("chat_id", chatID),
				zap.Error(err),
			)
		}
	}
	return nil
}

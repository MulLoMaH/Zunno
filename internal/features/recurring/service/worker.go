package recurring_service

import (
	"context"
	"fmt"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"go.uber.org/zap"
)

// StartWorker запускает фоновую горутину, которая раз в час проверяет регулярные операции.
func (s *RecurringService) StartWorker(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	// Первый запуск сразу при старте
	s.processToday(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.processToday(ctx)
		}
	}
}

func (s *RecurringService) processToday(ctx context.Context) {
	now := time.Now()
	today := now.Day()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	daysInMonth := time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, now.Location()).Day()
	pending, err := s.recurring.ListPendingForMonth(ctx, today, daysInMonth, monthStart)
	if err != nil {
		s.logger.Error("failed to list pending recurrings", zap.Error(err))
		return
	}

	if len(pending) == 0 {
		return
	}

	for _, rt := range pending {
		// Пропускаем шаблоны без категории (были удалены, но template остался)
		if rt.CategoryID == nil {
			s.logger.Warn("recurring template has no category, skipping",
				zap.String("recurring_id", rt.ID.String()),
				zap.String("title", rt.Title),
			)
			// Помечаем обработанным, чтобы не спамить каждую попытку
			_ = s.recurring.MarkProcessed(ctx, rt.ID, now)
			continue
		}

		// Атомарно помечаем как обработанный ПЕРЕД созданием транзакции.
		// Если другой инстанс воркера уже пометил — RowsAffected=0, мы пропускаем.
		// Это защищает от дублирования при race condition.
		marked, err := s.recurring.MarkProcessedAtomic(ctx, rt.ID, monthStart, now)
		if err != nil {
			s.logger.Error("failed to mark recurring as processed",
				zap.Error(err),
				zap.String("recurring_id", rt.ID.String()),
			)
			continue
		}
		if !marked {
			// Уже обработан другим инстансом / другим запуском
			continue
		}

		tx, err := s.budget.CreateTransaction(ctx, domain.Transaction{
			Type:        rt.Type,
			GroupID:     rt.GroupID,
			UserID:      rt.UserID,
			CategoryID:  *rt.CategoryID,
			Amount:      rt.Amount,
			Date:        now,
			Description: fmt.Sprintf("[Авто] %s", rt.Title),
		})
		if err != nil {
			s.logger.Error("failed to create auto transaction",
				zap.Error(err),
				zap.String("recurring_id", rt.ID.String()),
			)
			// Откатываем метку: не получилось создать транзакцию — попробуем в следующий раз
			_ = s.recurring.UnmarkProcessed(ctx, rt.ID)
			continue
		}

		s.logger.Info("auto transaction created",
			zap.String("tx_id", tx.ID.String()),
			zap.String("recurring_title", rt.Title),
			zap.Float64("amount", rt.Amount),
		)
	}
}

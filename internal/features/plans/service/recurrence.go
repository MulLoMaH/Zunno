package plan_service

import (
	"context"
	"fmt"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"go.uber.org/zap"
)

const (
	maxRecurrenceOccurrences = 12
	maxRecurrenceHorizon     = 90 * 24 * time.Hour
)

// RecurrenceInput — вход для повторяющегося события.
type RecurrenceInput struct {
	Rule  string     // 'daily' | 'weekly' | 'monthly'
	Until *time.Time // опциональный жёсткий предел
}

func (in *RecurrenceInput) validate() error {
	if in == nil {
		return nil
	}
	switch in.Rule {
	case "daily", "weekly", "monthly":
		return nil
	default:
		return fmt.Errorf("invalid recurrence rule %q", in.Rule)
	}
}

// nextOccurrence сдвигает time вперёд согласно правилу.
func nextOccurrence(t time.Time, rule string) time.Time {
	switch rule {
	case "daily":
		return t.AddDate(0, 0, 1)
	case "weekly":
		return t.AddDate(0, 0, 7)
	case "monthly":
		return t.AddDate(0, 1, 0)
	default:
		return t
	}
}

// materializeRecurrences создаёт дочерние plan_events для серии.
// Потолок: maxRecurrenceOccurrences ИЛИ maxRecurrenceHorizon, что наступит раньше.
// Плюс, если передан until — уважаем его.
func (s *PlanService) materializeRecurrences(
	ctx context.Context,
	parent domain.PlanEvent,
	rule string,
	until *time.Time,
) {
	horizon := time.Now().Add(maxRecurrenceHorizon)
	cutoff := horizon
	if until != nil && until.Before(cutoff) {
		cutoff = *until
	}

	rulePtr := rule
	current := parent.EventDate
	created := 0

	for i := 0; i < maxRecurrenceOccurrences; i++ {
		current = nextOccurrence(current, rule)
		if current.After(cutoff) {
			break
		}

		child := domain.PlanEvent{
			GroupID:         parent.GroupID,
			CreatorID:       parent.CreatorID,
			Title:           parent.Title,
			Description:     parent.Description,
			EventDate:       current,
			RecurrenceRule:  &rulePtr,
			RecurrenceUntil: parent.RecurrenceUntil,
			ParentPlanID:    &parent.ID,
		}
		if _, err := s.plans.CreatePlan(ctx, child); err != nil {
			s.logger.Error("materialize recurrence: create child",
				zap.String("parent_id", parent.ID.String()),
				zap.Time("event_date", current),
				zap.Error(err),
			)
			break
		}
		created++
	}

	s.logger.Info("recurrence materialized",
		zap.String("parent_id", parent.ID.String()),
		zap.String("rule", rule),
		zap.Int("children", created),
	)
}

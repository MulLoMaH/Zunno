package plan_service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

type PlanService struct {
	plans PlansRepository
}

type PlansRepository interface {
	CreatePlan(ctx context.Context, p domain.PlanEvent) (domain.PlanEvent, error)
	GetPlans(ctx context.Context, groupID uuid.UUID, from, to time.Time) ([]domain.PlanEvent, error)
	GetPlan(ctx context.Context, planID uuid.UUID) (domain.PlanEvent, error)
	UpdatePlan(ctx context.Context, planID uuid.UUID, title, description string, eventDate time.Time, isDone bool, expectedVersion int64) (domain.PlanEvent, error)
	DeletePlan(ctx context.Context, planID uuid.UUID) error

	CreateChecklistItem(ctx context.Context, c domain.ChecklistItem) (domain.ChecklistItem, error)
	GetChecklist(ctx context.Context, eventID uuid.UUID) ([]domain.ChecklistItem, error)
	GetChecklistItem(ctx context.Context, itemID uuid.UUID) (domain.ChecklistItem, error)
	UpdateChecklistItem(ctx context.Context, itemID uuid.UUID, text string, isChecked bool, expectedVersion int64) (domain.ChecklistItem, error)
	DeleteChecklistItem(ctx context.Context, itemID uuid.UUID) error
}

func NewPlanService(plans PlansRepository) *PlanService {
	return &PlanService{plans: plans}
}

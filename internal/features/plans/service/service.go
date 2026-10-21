package plan_service

import (
	"context"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	"github.com/google/uuid"
)

type PlanService struct {
	plans  PlansRepository
	logger *core_logger.Logger
}

type PlansRepository interface {
	SetRSVP(ctx context.Context, eventID, userID uuid.UUID, status string) error
	GetRSVPs(ctx context.Context, eventID uuid.UUID) ([]domain.PlanAttendee, error)
	CreateComment(ctx context.Context, eventID, userID uuid.UUID, text string) (domain.PlanComment, error)
	GetComments(ctx context.Context, eventID uuid.UUID) ([]domain.PlanComment, error)
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

func NewPlanService(plans PlansRepository, logger *core_logger.Logger) *PlanService {
	return &PlanService{plans: plans, logger: logger}
}

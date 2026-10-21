package goal_service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
)

type GoalService struct {
	goals  GoalsRepository
	logger *core_logger.Logger
}

type GoalsRepository interface {
	ReorderGoalItems(ctx context.Context, categoryID uuid.UUID, itemIDs []uuid.UUID) error
	ReorderGoalCategories(ctx context.Context, groupID uuid.UUID, categoryIDs []uuid.UUID) error
	CreateGoalCategory(ctx context.Context, cat domain.GoalCategory) (domain.GoalCategory, error)
	GetGoalCategories(ctx context.Context, groupID uuid.UUID) ([]domain.GoalCategory, error)
	GetGoalCategory(ctx context.Context, categoryID uuid.UUID) (domain.GoalCategory, error)
	UpdateGoalCategory(ctx context.Context, categoryID uuid.UUID, name string, expectedVersion int64) (domain.GoalCategory, error)
	DeleteGoalCategory(ctx context.Context, categoryID uuid.UUID) error

	CreateGoalItem(ctx context.Context, item domain.GoalItem) (domain.GoalItem, error)
	GetGoalItems(ctx context.Context, categoryID uuid.UUID) ([]domain.GoalItem, error)
	GetGoalItem(ctx context.Context, itemID uuid.UUID) (domain.GoalItem, error)
	MarkGoalItemDone(ctx context.Context, itemID uuid.UUID, done bool, expectedVersion int64) (domain.GoalItem, error)
	DeleteGoalItem(ctx context.Context, itemID uuid.UUID) error

	// Deadlines
	SetGoalCategoryDueDate(ctx context.Context, categoryID uuid.UUID, dueDate *time.Time) (domain.GoalCategory, error)
}

func NewGoalService(goals GoalsRepository, logger *core_logger.Logger) *GoalService {
	return &GoalService{goals: goals, logger: logger}
}

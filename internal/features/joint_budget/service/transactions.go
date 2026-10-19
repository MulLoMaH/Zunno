package budget_service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_kafka "github.com/MulLoMaH/Zunno/internal/core/kafka"
	budget_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/joint_budget/repository/postgres"
)

type GetTransactionsFilter struct {
	Query *string
	From       *time.Time
	To         *time.Time
	CategoryID *uuid.UUID
	UserID     *uuid.UUID
	Limit      int
	Offset     int
}

type CreateTransactionInput struct {
	Type string
	CategoryID  uuid.UUID
	Amount      float64
	Date        time.Time
	Description string
}

func (s *BudgetService) CreateTransaction(
	ctx context.Context,
	groupID, userID uuid.UUID,
	in CreateTransactionInput,
) (domain.Transaction, error) {
	if _, err := s.ensureCategoryInGroup(ctx, in.CategoryID, groupID); err != nil {
		return domain.Transaction{}, err
	}

	if in.Type != domain.TransactionTypeIncome && in.Type != domain.TransactionTypeExpense {
		return domain.Transaction{}, fmt.Errorf("invalid type: %w", core_errors.ErrInvalidArgument)
	}
	if in.Amount <= 0 {
		return domain.Transaction{}, fmt.Errorf("amount must be > 0: %w", core_errors.ErrInvalidArgument)
	}
	if in.Date.IsZero() {
		return domain.Transaction{}, fmt.Errorf("date required: %w", core_errors.ErrInvalidArgument)
	}
	if len([]rune(in.Description)) > 255 {
		return domain.Transaction{}, fmt.Errorf("description too long: %w", core_errors.ErrInvalidArgument)
	}

	tx := domain.Transaction{
		Type: in.Type,
		GroupID:     groupID,
		UserID:      userID,
		CategoryID:  in.CategoryID,
		Amount:      in.Amount,
		Date:        in.Date,
		Description: in.Description,
	}
	created, err := s.budget.CreateTransaction(ctx, tx)
	if err != nil {
		return domain.Transaction{}, fmt.Errorf("create transaction: %w", err)
	}

	// Публикуем событие. Ошибка Kafka НЕ должна ронять создание транзакции.
	evt := core_kafka.TransactionCreatedEvent{
		Type:          core_kafka.EventTransactionCreated,
		TransactionID: created.ID,
		GroupID:       created.GroupID,
		UserID:        created.UserID,
		CategoryID:    created.CategoryID,
		Amount:        created.Amount,
		Date:          created.Date,
		CreatedAt:     created.CreatedAt,
	}
	if err := s.producer.Publish(ctx, created.ID.String(), evt); err != nil {
		// TODO: добавить outbox pattern; пока просто логируем
		log.Printf("KAFKA PUBLISH FAILED: %v", err)
	}

	return created, nil
}

func (s *BudgetService) GetTransactions(
	ctx context.Context,
	groupID uuid.UUID,
	f GetTransactionsFilter,
) ([]domain.Transaction, error) {
	repoFilter := budget_postgres_repository.TransactionsFilter{
		Query: f.Query,
		GroupID:    groupID,
		From:       f.From,
		To:         f.To,
		CategoryID: f.CategoryID,
		UserID:     f.UserID,
		Limit:      f.Limit,
		Offset:     f.Offset,
	}
	txs, err := s.budget.GetTransactions(ctx, repoFilter)
	if err != nil {
		return nil, fmt.Errorf("get transactions: %w", err)
	}
	return txs, nil
}

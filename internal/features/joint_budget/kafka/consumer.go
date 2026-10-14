package budget_kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"

	core_kafka "github.com/MulLoMaH/Zunno/internal/core/kafka"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

type StatsUpdater interface {
	UpsertCategoryStats(ctx context.Context, evt core_kafka.TransactionCreatedEvent, month string) error
}

type Handler struct {
	repo StatsUpdater
}

func NewHandler(repo StatsUpdater) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Handle(ctx context.Context, msg kafka.Message) error {
	log.Printf("BUDGET HANDLER: got msg len=%d", len(msg.Value))
	var evt core_kafka.TransactionCreatedEvent
	if err := json.Unmarshal(msg.Value, &evt); err != nil {
		return fmt.Errorf("unmarshal event: %w", err)
	}

	if evt.Type != core_kafka.EventTransactionCreated {
		// неизвестный тип — пропускаем, но не падаем
		return nil
	}

	month := evt.Date.Format("2006-01")
	if err := h.repo.UpsertCategoryStats(ctx, evt, month); err != nil {
		return fmt.Errorf("upsert stats: %w", err)
	}
	log.Printf("BUDGET HANDLER: stats upserted, month=%s", month)
	return nil
}

var _ = time.Second
var _ = core_postgres_pool.Pool(nil)

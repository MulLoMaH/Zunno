package core_kafka

import (
	"time"

	"github.com/google/uuid"
)

const EventTransactionCreated = "transaction.created"

type TransactionCreatedEvent struct {
	Type          string    `json:"type"`
	TransactionID uuid.UUID `json:"transaction_id"`
	GroupID       uuid.UUID `json:"group_id"`
	UserID        uuid.UUID `json:"user_id"`
	CategoryID    uuid.UUID `json:"category_id"`
	Amount        float64   `json:"amount"`
	Date          time.Time `json:"date"`
	CreatedAt     time.Time `json:"created_at"`
}

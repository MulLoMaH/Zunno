package core_kafka

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

type Handler func(ctx context.Context, msg kafka.Message) error

type Consumer struct {
	reader  *kafka.Reader
	handler Handler
}

func NewConsumer(cfg Config, handler Handler) *Consumer {
	return &Consumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers:        cfg.Brokers,
			Topic:          cfg.Topic,
			GroupID:        cfg.GroupID,
			MinBytes:       1,
			MaxBytes:       10e6,
			MaxWait:        200 * time.Millisecond,
			CommitInterval: 1 * time.Second, // автокоммит раз в секунду
		}),
		handler: handler,
	}
}

func (c *Consumer) Run(ctx context.Context) error {
	defer c.reader.Close()

	log.Printf("KAFKA CONSUMER STARTED: topic=%s group=%s", c.reader.Config().Topic, c.reader.Config().GroupID)

	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			log.Printf("KAFKA READ ERROR: %v", err)
			return fmt.Errorf("read message: %w", err)
		}

		log.Printf("KAFKA RECEIVED: partition=%d offset=%d key=%s", msg.Partition, msg.Offset, string(msg.Key))

		if err := c.handler(ctx, msg); err != nil {
			log.Printf("KAFKA HANDLER ERROR: %v, msg: %s", err, string(msg.Value))
			continue
		}
	}
}

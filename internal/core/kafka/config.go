package core_kafka

import (
	"fmt"

	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Brokers []string `envconfig:"BROKERS" required:"true"`
	Topic   string   `envconfig:"TOPIC" default:"budget-events"`
	GroupID string   `envconfig:"GROUP_ID" default:"zunno-budget-consumer"`
}

func NewConfig() (Config, error) {
	var cfg Config
	if err := envconfig.Process("KAFKA", &cfg); err != nil {
		return Config{}, fmt.Errorf("process kafka env: %w", err)
	}
	return cfg, nil
}

func NewConfigMust() Config {
	cfg, err := NewConfig()
	if err != nil {
		panic(err)
	}
	return cfg
}
